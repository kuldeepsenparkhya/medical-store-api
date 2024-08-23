const { default: mongoose } = require('mongoose')
const { DB_URI } = require('../config/config')

mongoose.connect(`${DB_URI}`).then(() => console.log('Db connection done')).catch(error => console.log('Error>>>>>>', error))

const db = {
    User: require('./user'),
    Brand: require('./brand'),
    ProductCategory: require('./category'),
    Product: require('./product'),
}

module.exports = db
