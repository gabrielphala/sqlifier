const SQLDate = require("./Date")

module.exports = class Utility {
    static removeAtEndOfString (str, toRemove) {
        str = str.trim()

        return str.substring(0, str.length - toRemove.length)
    }

    static isDate (obj) {
        if (Object.prototype.toString.call(obj) === '[object Date]') return true;
        else return false;
    }

    static normalizeValue (value, isRaw = false) {
        if (value == null || typeof value == 'number')
            return value;

        else if (typeof value == 'boolean') return value ? 1 : 0;

        else if (typeof value == 'string') return `${isRaw ? value : `'${value}'`}`;

        else if (typeof value == 'function') return this.normalizeValue(value(), isRaw)

        else if (Utility.isDate(value)) return `${isRaw ? SQLDate.toSQLDatetime(value) : `'${SQLDate.toSQLDatetime(value)}'`}`;

        else if (typeof value == 'object') {
            switch (Object.keys(value)[0]) {
                case '$r':
                    return this.normalizeValue(Object.values(value)[0], true)
                default:
                    return this.normalizeValue(Object.values(value)[0], isRaw)
            }
        }

        return null;
    }

    static evalOperators (obj) {
        if (
            obj == null ||
            typeof obj != 'object' ||
            Array.isArray(obj) ||
            Utility.isDate(obj)
        ) return '=';

        const ops = {
            '$ne': '!=',
            '$gt': '>',
            '$gte': '>=',
            '$lt': '<',
            '$lte': '<=',
            '$r': '=',
        }

        return ops[Object.keys(obj)[0]];
    }

    static each (data, cb) {
        for (const key in data) {
            if (!data.hasOwnProperty(key))
                continue;

            cb(key, data[key])
        }
    }

    static extractSchemaColumns (schema) {
        const arr = [];

        Utility.each(schema, columnName => {
            arr.push(columnName)
        })

        return arr;
    }

    static exitOnError (err) {
        if (err) {
            console.error('Database error: ', err);
            process.exit(1)
        }
    }
}