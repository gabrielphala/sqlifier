const Builder = require("./Builder")

// TODO: check types and verify length
module.exports = class SQLifier {
    #builder;
    #conn;
    
    constructor () {
        this.#builder = new Builder()
        this.#conn = this.#builder.conn;
    }

    get builder () {
        return this.#builder
    }

    get conn () {
        return this.#conn
    }

    get table () {
        return this.#builder.table
    }

    get primaryKey () {
        return this.#builder.primaryKey;
    }

    schema (tableName, schema) {
        this.builder.schema(tableName, schema)
    }

    insert (data) {
        return new Promise((resolve, reject) => {
            const _data = {
                ...data,
                ...this.#builder.updateDefaultDateFields(this.table),
                ...this.#builder.updateStaticDateFields(this.table, data)
            }

            const { columns, values } =
                this.builder.getColumnValuePairs(_data);

            this.conn.query(`
                INSERT INTO ${this.table} (${columns}) VALUES (${values});
            `, (err, res) => {
                if (err) reject(err)

                this.conn.query(`
                   SELECT * FROM ${this.table} ORDER BY ${this.primaryKey} DESC LIMIT 1;
                `, this.builder.resHandler(resolve, reject, true))
            })
        })
    }

    update (condition, data) {
        return new Promise((resolve, reject) => {
            const updates = this.builder.assignValues(data);
            const resolvedCondition = this.builder.buildOr(condition);

            this.conn.query(`
                UPDATE ${this.table}
                SET ${updates}
                WHERE ${resolvedCondition}
            `, this.builder.resHandler(resolve, reject))
        })
    }

    exists (condition) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT COUNT(${this.primaryKey}) as found FROM ${this.table} ${condition ? 'WHERE ' + this.builder.buildOr(condition) : ''}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    count (condition) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT COUNT(${this.primaryKey}) as ${this.primaryKey} FROM ${this.table} ${condition ? 'WHERE ' + this.builder.buildOr(condition) : ''}
            `, (err, out) => {
                if (err == null) resolve(out[0][this.primaryKey]);

                else reject(err);
            })
        })
    }

    find ({ condition = '', select = '*', join } = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${this.builder.joinSafeSelect(select, join)} FROM ${this.table} ${this.builder.evalCondition(condition, join)}
            `, this.builder.resHandler(resolve, reject))
        })
    }

    findOne ({ condition = '', select = '*', join } = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${this.builder.joinSafeSelect(select, join)} FROM ${this.table} ${this.builder.evalCondition(condition, join, 'LIMIT 1')} 
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    findLatestOne ({condition = '', select = '*', join} = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${this.builder.joinSafeSelect(select, join)} FROM ${this.table} ${this.builder.evalCondition(condition, join, `ORDER BY ${this.table}.${this.primaryKey} DESC LIMIT 1`)}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    findOldestOne ({condition = '', select = '*', join, coalesce = false} = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${this.builder.joinSafeSelect(select, join)} FROM ${this.table} ${this.builder.evalCondition(condition, join, `ORDER BY ${this.table}.${this.primaryKey} ASC LIMIT 1`)}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    search ({ condition = '', select = '*', join, coalesce = false } = {}) {
        return new Promise((resolve, reject) => {
            this.builder.canSearch()

            select = coalesce ? this.builder.coalesce(select, join) : select;

            this.conn.query(`
            SELECT ${this.builder.joinSafeSelect(select, join)} FROM ${this.table} ${this.builder.evalCondition(condition, join)}
            `, this.builder.resHandler(resolve, reject))

            this.builder.removeSearch()
        })
    }

    unionSearch ({ conditions = [], select = '*', joins = [], coalesce = false }) {
        return new Promise((resolve, reject) => {
            this.builder.canSearch()

            let i = 0;

            const getSelect = () => Array.isArray(select) ? select[i] : select;

            const unionJoins = [];
            const unionTables = [];

            joins.forEach(join => { 
                join.forEach(table => {
                    unionJoins.push({ ref: table.ref, select: '*' })
                });
            });

            let query = '';

            for (; i < Math.max(conditions.length, joins.length); i++) {
                const join = joins[i];
                const condition = conditions[i];

                select = getSelect();
                select = coalesce ? this.builder.coalesce(select, join) : select;

                query += `${ i == 0 ? '' : 'UNION' } SELECT ${this.builder.joinSafeSelect(select, unionJoins)} FROM ${this.table} ${this.builder.evalCondition(condition, join)}`;
            }

            this.conn.query(query, this.builder.resHandler(resolve, reject));

            this.builder.removeSearch();
        })
    }

    raw (sql) {
        return new Promise((resolve, reject) => {
            this.conn.query(sql, this.builder.resHandler(resolve, reject))
        })
    }
}