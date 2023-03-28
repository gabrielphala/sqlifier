# SQLify
## A MySQL ORM (Object-Relational Mapping) for NodeJS

<br>

## Installation
Make sure to have MySQL installed, now run the following command
```powershell
npm i sqlifier
```

## Usage
### Configuration

We will first have to configure the database connection, and include that file somewhere in the project before the models are defined.


config/db.js
```javascript
const { Connection } = require("mysqlifier");

const conn = new Connection();
conn.createConnection('localhost', 'root', '', require("mysql"))
conn.createDatabase('testdb');
```
<br>

### Initiate the connection
To really connect to the database we need to require the configuration file somewhere in our code. For the sake of simplicity we will use `app.js`

```javascript
/* Express configuration here */
require("./config/db.js")
require("./model/User.js")
```

### Defining a model
Now that the config file has been loaded, we can create models. Let's start with a User model.

model/User.js

```javascript
const { SQLifier } = require("sqlifier")

class User extends SQLifier {
    constructor () {
        super()

        this.schema('user', {
            id: { type: 'int', isPrimary: true, isAutoIncrement: true },
            firstname: { type: 'varchar', length: 18 },
            lastname: { type: 'varchar', length: 18 },
            email: { type: 'varchar', length: 50 },
            photoLocation: { type: 'varchar', length: 18, default: 'blank.png' },
            password: { type: 'varchar', length: 255 },
        })
    }

    add (data) {
        return this.insert(data)
    }
}
```
Let's add some nuanced functionality using services

### Service
services/User.js
```javascript
const User = require("./models/User.js")

module.exports = class UserServices {
    /* For the sake of brevity, this part will be ommited for future srvices */
}
```

Let's create a new user

*This method is within `UserServices` class*
```javascript
static async createNewUser () {
    // data cleaning & validation

    const userInfo = await User.add({
        firstname: 'John',
        lastname: 'Doe',
        email: 'johndoe@gmail.com'
    })

    // let's change firstname for whatever reason

    userInfo.firstname = 'Adam'

    userInfo.save();

    console.log(userInfo);
}
```

If we want to change the profile picture of a user we can just simply fetch, update and save.

*This method is within `UserServices` class*
```javascript
static async updateProfilePhoto (userId) {
    // photo uploading logic

    const userInfo = await User.findOne({ id: userId })

    userInfo.photoLocation = 'new-name.jpg';

    userInfo.save();
}
```