module.exports = new (class Middleware {
    constructor () {
        if (!Middleware.instance)
            Middleware.instance = this;

        this.middlewareFunctions = [];

        return Middleware.instance;
    }

    add (cb) {
        this.middlewareFunctions.push(cb)
    }

    run () {
        this.middlewareFunctions.forEach(middlewareFunction => {
            middlewareFunction()
        });

        this.middlewareFunctions = []
    }

    immediate (cb) {
        this.run()

        return cb()
    }
});