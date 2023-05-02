const Utility = require("./Utility")
const { get } = require('./LocalStorage')

module.exports = class Model {
    _properties = {};
    _table;

    constructor (table, properties) {
        this._properties = properties;
        this._table = table;

        Utility.each(properties, (key, value) => {
            this[key] = value;
        })
    }

    setBuilder (builder) {
        this._builder = builder;

        return this;
    }

    getPrimaryKey () {
        let primaryKey;

        Utility.each(get('dbcache.schema')[this._table], (key, value) => {
            if (value.isPrimary)
                primaryKey = key;
        })

        return primaryKey;
    }

    get isEmpty () {
        if (this._properties) return false;

        return true;
    }

    toObject () {
        const properties = {};

        Utility.each(this._properties, (key) => {
            properties[key] = this[key];
        })

        return properties;
    }

    toJSON () {
        return JSON.stringify(this.toObject())
    }

    save () {
        const primaryKey = this.getPrimaryKey()

        const condition = {}
        condition[primaryKey] = this[primaryKey];

        Utility.each(this._properties, (key) => {
            this._properties[key] = this[key];
        })

        delete this._properties[primaryKey];

        return new Promise((resolve, reject) => {
            const updates = this._builder.assignValues(this._properties);
            const resolvedCondition = this._builder.buildOr(condition);

            this._builder.conn.query(`
                UPDATE ${this._table}
                SET ${updates}
                WHERE ${resolvedCondition}
            `, this._builder.resHandler(resolve, reject))
        })
    }
}