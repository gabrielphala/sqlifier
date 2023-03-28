const Middleware = require("./Middleware");
const Utility = require("./Utility");

module.exports = class Connection {
    constructor () {
        if (!Connection.instance)
            Connection.instance = this;

        this.conn = null;

        return Connection.instance;
    }

    createConnection (host, user, password, mysql) {
        this.conn = mysql.createConnection({
            host,
            user,
            password
        });
    }

    connect () {
        Middleware.add(() => {
            this.conn.connect((err) => {
                Utility.exitOnError(err)
            })
        })
    }

    query (query) {
        return Middleware.immediate(() => {
            return new Promise((resolve, reject) => {
                this.conn.query(query, (err, res) => {
                    if (err) return reject(err);

                    resolve(res)
                })
            });
        })
    }

    createDatabase (name) {
        this.dbName = name;

        this.connect()

        this.query(`CREATE DATABASE IF NOT EXISTS ${name}`)

        this.query(`USE ${this.dbName}`);
    }
}