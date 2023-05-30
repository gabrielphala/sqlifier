module.exports = new(class Timezone {
    _timezones = {
        'Africa/Johannesburg': '+02:00'
    }

    constructor () {
        if (Timezone.instance) return Timezone.instance;
        
        Timezone.instance = this;

        this.default = 'Africa/Johannesburg';

        return Timezone.instance;
    }

    setTimezone (timezone) {
        if (!this._timezones[timezone]) throw `Timezone (${timezone}) not supported`;

        this.default = timezone;
    }

    getDefaultOffset () {
        return this._timezones[this.default];
    }
});