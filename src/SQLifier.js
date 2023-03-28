const Builder = require("./Builder")

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

    schema (tableName, schema) {
        this.builder.schema(tableName, schema)
    }

    insert (data) {
        return new Promise((resolve, reject) => {
            const { columns, values } = this.builder.getColumnValuePairs(data);

            this.conn.query(`
                INSERT INTO ${this.table} (${columns}) VALUES (${values});
            `, (err, res) => {
                if (err) reject(err)

                this.conn.query(`
                   SELECT * FROM ${this.table} ORDER BY id DESC LIMIT 1;
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
            SELECT COUNT(id) as found FROM ${this.table} ${condition ? 'WHERE ' + this.builder.buildOr(condition) : ''}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    count (condition) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT COUNT(id) as id FROM ${this.table} ${condition ? 'WHERE ' + this.builder.buildOr(condition) : ''}
            `, (err, out) => {
                if (err == null) resolve(out[0].id);

                else reject(err);
            })
        })
    }

    find ({ condition = '', select = '*', join } = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${select} FROM ${this.table} ${this.builder.evalCondition(condition, join)}
            `, this.builder.resHandler(resolve, reject))
        })
    }

    findOne ({ condition = '', select = '*', join } = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${select} FROM ${this.table} ${this.builder.evalCondition(condition, join, 'LIMIT 1')} 
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    findLatestOne ({condition = '', select = '*', join} = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${select} FROM ${this.table} ${this.builder.evalCondition(condition, join, `ORDER BY ${this.table}.id DESC LIMIT 1`)}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    findOldestOne ({condition = '', select = '*', join, coalesce = false} = {}) {
        return new Promise((resolve, reject) => {
            this.conn.query(`
            SELECT ${select} FROM ${this.table} ${this.builder.evalCondition(condition, join, `ORDER BY ${this.table}.id ASC LIMIT 1`)}
            `, this.builder.resHandler(resolve, reject, true))
        })
    }

    search ({ condition = '', select = '*', join, coalesce = false } = {}) {
        return new Promise((resolve, reject) => {
            this.builder.canSearch()

            select = coalesce ? this.builder.coalesce(select, join) : select;

            this.conn.query(`
            SELECT ${select} FROM ${this.table} ${this.builder.evalCondition(condition, join)}
            `, this.builder.resHandler(resolve, reject))

            this.builder.removeSearch()
        })
    }
}