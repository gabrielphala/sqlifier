module.exports = class Utility {
    static removeAtEndOfString (str, toRemove) {
        str = str.trim()

        return str.substring(0, str.length - toRemove.length)
    }

    static normalizeValue (value, isRaw = false) {
        if (value == null || typeof value == 'boolean' || typeof value == 'number')
            return value;

        else if (typeof value == 'string') return `${isRaw ? value : `'${value}'`}`;

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
        if (obj == null || typeof obj != 'object') return '=';

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

    static exitOnError (err) {
        if (err) {
            console.error('Database error: ', err);
            process.exit(1)
        }
    }
}