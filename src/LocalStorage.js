const LocalStorage = require('node-localstorage').LocalStorage;
localStorage = new LocalStorage(__dirname + '/cache/local-storage');

module.exports.set = (key, value) => {
    localStorage.setItem(key, JSON.stringify({ data: value }));
}

module.exports.get = (key) => {
    const data = JSON.parse(localStorage.getItem(key))

    return data ? data.data : null
}

module.exports.remove = (key) => localStorage.removeItem(key)