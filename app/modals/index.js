const { default: mongoose } = require('mongoose')
const { DB_URI } = require('../config/config')

mongoose.connect(`${DB_URI}`).then(() => console.log('Db connection done')).catch(error => console.log('Error>>>>>>', error))

const db = {
    User: require('./user'),

}

module.exports = db
