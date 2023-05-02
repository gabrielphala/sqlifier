class SQLDate {
    static get date () {
        return new Date((new Date).toLocaleString('en-US', { timeZone: 'Africa/Johannesburg' }));
    }

    static makeDate (date) {
        const newDate = date || new Date();

        return 
    }

    static now () {
        return (new Date()).toISOString().slice(0, 19).replace('T', ' ');
    }

    static toSQLDatetime (date) {
        return (new Date()).toISOString().slice(0, 19).replace('T', ' ');
    }
}

module.exports = SQLDate;