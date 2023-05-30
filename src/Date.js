const moment = require("moment-timezone");

const Timezones = require("./Timezones")

class SQLDate {
    static now () {
        return moment().tz(Timezones.default).format('YYYY-MM-DD HH:mm:ss')
    }

    // TODO this neds to check if date is string if so, check if it has a timezone
    static toSQLDatetime (date) {
        return moment(date).tz(Timezones.default).format('YYYY-MM-DD HH:mm:ss')
    }
}

module.exports = SQLDate;