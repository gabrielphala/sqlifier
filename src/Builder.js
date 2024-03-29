const Connection = require('./Connection')

const Utility = require("./Utility")
const Model = require("./Model")
const { get, set } = require('./LocalStorage')

if (!get('dbcache.schema')) {
    set('dbcache.schema', { })
}

module.exports = class Builder {
    #tableName;
    #namespace;
    #connection
    #conn;
    #canSearch = false;
    #foreignKeyCount = 0;
    #dateFields = {}

    constructor () {
        this.#connection = new Connection()
        this.#conn = this.connection.conn
    }

    get namespace () {
        return this.#namespace;
    }

    get table () {
        return this.#tableName;
    }

    get connection () {
        return this.#connection;
    }

    get conn () {
        return this.#conn;
    }

    canSearch () {
        this.#canSearch = true;
    }

    isColumnDate (fieldType) {
        return (
            ['datetime', 'date', 'timestamp'].includes(fieldType.toLowerCase())
        )
    }

    removeSearch () {
        this.#canSearch = false;
    }

    safely (namespace, cb = null) {
        this.#namespace = typeof namespace == 'function' ? this.#tableName : namespace;
        cb = typeof namespace == 'function' ? namespace : cb;

        const cb_output = cb()

        this.#namespace = null;

        return cb_output;
    }

    alterTable (columns) {
        this.conn.query(`
            ALTER TABLE ${this.table}
            ${columns}
            `, (err, res) => {
            if (err) console.log(err);
        })
    }

    rememberDateField (columnName, getDate) {
        if (!this.#dateFields[this.#tableName]) this.#dateFields[this.#tableName] = {}

        this.#dateFields[this.#tableName][columnName] = getDate;
    }

    updateDefaultDateFields (tableName) {
        const fields = {};

        Utility.each(this.#dateFields[tableName], (columnName, value) => {
            fields[columnName] = Utility.normalizeValue(value, true);
        })

        return fields;
    }

    updateStaticDateFields (tableName, data) {
        const fields = {};

        Utility.each(this.#dateFields[tableName], (columnName) => {
            if (data[columnName]) fields[columnName] = Utility.normalizeValue(data[columnName], true);
        })

        return fields;
    }

    makeForeignKey (ref, field, { ref_field = 'id' } = {}) {
        return `
            CONSTRAINT fk_${++this.#foreignKeyCount}_${this.table}_${ref}
            FOREIGN KEY (${field})
            REFERENCES ${ref}(${ref_field})
            ON DELETE CASCADE
            ON UPDATE CASCADE,
        `;
    }

    getTableDefinition (schema, { linePrefix = '', lineSuffix = ',', nameOnly = false } = {}) {
        let def = '', line = '';

        Utility.each(schema, (columnName, column) => {
            if (column && this.isColumnDate(column.type))
                this.rememberDateField(columnName, column.default)

            line = !nameOnly ?
                `${columnName}
                    ${column.length ? column.type + '(' + column.length + ')' : column.type}
                    ${column.isAutoIncrement ? ' AUTO_INCREMENT' : ''}
                    ${column.default != undefined ? `DEFAULT ${Utility.normalizeValue(column.default)}` : ''}
                ${lineSuffix}\n` :
                
                `${columnName}${lineSuffix}\n`
                
            if (column && column.isPrimary) {
                this.primaryKey = columnName;

                line = line + `${column && column.isPrimary ? 'PRIMARY KEY (' + columnName + '),\n' : ''}`;
            }
                
            else if (column && column.ref)
                line = line + (column.ref ? this.makeForeignKey(column.ref, columnName, { ref_field: column.refField || 'id' }) : '');
                
            def += linePrefix + line;
        })

        return Utility.removeAtEndOfString(def, ',');
    }

    getColumnValuePairs (data) {
        let columns = '', values = '';

        Utility.each(data, (key, value) => {
            columns += key + ',';
            values += `'${data[key] || null}',`
        })

        return {
            columns: Utility.removeAtEndOfString(columns, ','),
            values: Utility.removeAtEndOfString(values, ',')
        }
    }

    getNewColumns (oldSchema, newSchema) {
        const columnsToAdd = [];

        Utility.each(newSchema, (columnName) => {
            if (!oldSchema.hasOwnProperty(columnName))
                columnsToAdd.push(columnName)
        })

        return columnsToAdd;
    }

    getOldColumns (oldSchema, newSchema) {
        const columnsToRemove = [];

        Utility.each(oldSchema, (columnName) => {
            if (!newSchema.hasOwnProperty(columnName))
                columnsToRemove.push(columnName)
        })

        return columnsToRemove;
    }

    getSchemaChanges (columns, schema) {
        const schemaCutOut = {}

        columns.forEach(columnName => {
            schemaCutOut[columnName] = schema[columnName]
        });

        return schemaCutOut;
    }

    resHandler = (resolve, reject, first = false) => (err, out) => {
        if (err == null) {
            resolve(
                !first ?
                out :
                (
                    out[0] ?
                    (new Model(this.table, out[0])).setBuilder(new Builder()) :
                    null
                )
            )
        }

        else reject(err);
    }

    applyChanges (oldSchema, newSchema) {
        const newColumns = this.getNewColumns(oldSchema, newSchema);
        const oldColumns = this.getOldColumns(oldSchema, newSchema);

        if (newColumns && oldSchema)
            this.alterTable(
                this.getTableDefinition(this.getSchemaChanges(newColumns, newSchema), { linePrefix: 'ADD ', lineSuffix: ';' })
            )

        if (oldColumns)
            this.alterTable(
                this.getTableDefinition(this.getSchemaChanges(oldColumns, newSchema), { linePrefix: 'DROP ', nameOnly: true, lineSuffix: ';' })
            )
    }

    schema (tableName, schema) {
        this.#tableName = tableName;

        const tableDef = this.getTableDefinition(schema),
            cachedSchema = get('dbcache.schema');

        this.conn.query(`
            CREATE TABLE IF NOT EXISTS ${tableName} (
                ${tableDef}
            );
            `, (err, res) => {
            Utility.exitOnError(err)
        })

        if (cachedSchema && cachedSchema[tableName])
            this.applyChanges(cachedSchema[tableName], schema)

        cachedSchema[tableName] = schema;

        set('dbcache.schema', cachedSchema)
    }

    assignValues (data, sep = ',') {
        let query = '';

        Utility.each(data, (key, value) => {
            if (!key) return;

            if (!this.#canSearch) query += `${this.namespace ? this.namespace + '.' + key : key} ${Utility.evalOperators(value)} ${Utility.normalizeValue(value)} ${sep} `;

            else query += `${this.namespace ? this.namespace + '.' + key : key} LIKE '%${Utility.normalizeValue(value, true)}%' ${sep} `;
        })

        return Utility.removeAtEndOfString(query, sep)
    }

    coalesce (select, { ref }) {
        const mainStructure = get('dbcache.schema')[this.#tableName]
        const refStructure = get('dbcache.schema')[ref];

        select = select == '*' ? Object.keys(mainStructure).toString() : select;

        const selectArr = select.split(',');

        let newSelectStatement = '';

        selectArr.forEach(columnName => {
            const columnNameArr = columnName.split('.')

            if (columnNameArr.length == 1 && refStructure[columnName])
                newSelectStatement += `COALESCE(${this.#tableName}.${columnName}, ${ref}.${columnName}) AS ${columnName},`;

            else if (columnNameArr.length == 2 && columnNameArr[0] == ref)
                newSelectStatement += 
                    `${select.indexOf(`'${this.#tableName}.${columnNameArr[1]}'`) == -1 ? columnNameArr[1] : `${columnNameArr[1]} AS ${ref}_${columnNameArr[1]}`}, `;
            
            else if (columnNameArr.length == 2 && columnNameArr[0] == this.#tableName)
                newSelectStatement +=
                    `${select.indexOf(`'${ref}.${columnNameArr[1]}'`) == -1 ? columnNameArr[1] : `${columnNameArr[1]} AS ${this.#tableName}_${columnNameArr[1]}`}, `;
           
            else 
                newSelectStatement += `${columnName},`

        });

        return Utility.removeAtEndOfString(newSelectStatement, ',');
    }

    getSelectedColumns (select, tableName) {
        if (select != '*') return select.split(',')

        return Utility.extractSchemaColumns(get('dbcache.schema')[tableName])
    }

    safelyPrefix (name, tableName, usedColumnNames) {
        if (usedColumnNames.hasOwnProperty(name)) {
            return this.safelyPrefix(`_${tableName}_${name}`, tableName, usedColumnNames)
        }

        usedColumnNames[name] = name;

        return name;
    }

    namespaceColumns (arr, tableName, usedColumnNames) {
        for (let c = 0; c < arr.length; c++) {
            const safeName = this.safelyPrefix(arr[c].trim(), tableName, usedColumnNames);

            arr[c] = `${tableName}.${arr[c].trim()} AS ${safeName}`;
        }
    }

    joinSafeSelect (select, join) {
        const usedColumnNames = {};

        let columns = this.getSelectedColumns(select, this.#tableName);
        
        this.namespaceColumns(columns, this.#tableName, usedColumnNames)

        join = Array.isArray(join) ? join : [join];

        join.forEach(clause => {
            if (clause) {
                let joinColumns = this.getSelectedColumns(clause.select || '*', clause.ref);

                this.namespaceColumns(joinColumns, clause.ref, usedColumnNames)

                columns = columns.concat(joinColumns);
            }
        });

        return columns.join(', ');
    }

    buildAnd (data) {
        return this.assignValues(data, 'AND')
    }

    buildOr (data) {
        data = Array.isArray(data) ? data : [data];

        let query = '';

        data.forEach(condition => {
            query += this.buildAnd(condition) + ' OR '
        })

        return Utility.removeAtEndOfString(query, 'OR')
    }

    buildJoinCondition (join) {
        return join.condition ?
            this.buildOr(join.condition) :
            `${this.table}.${join.id} = ${join.ref}.id`
    }

    buildJoin (join = {}) {
        const joinCondition = this.safely(join.ref, () => this.buildJoinCondition(join))
        
        return `
            ${!join.kind ? 'INNER' : join.kind} JOIN ${join.ref} ON ${joinCondition}
        `
    }

    makeJoinClauses (join) {
        if (!Array.isArray(join)) return this.buildJoin(join);

        let compoundedJoins = '';

        join.forEach(clause => compoundedJoins += this.buildJoin(clause));

        return compoundedJoins;
    }

    evalCondition (condition, join, modifiers = '') {
        let query = '';

        if (join) query += this.makeJoinClauses(join);

        if (condition) query += `WHERE ${this.safely(() => this.buildOr(condition))} ${modifiers}`;

        return query;
    }
}