const { inventories } = require('../controllers');

var router = require('express').Router();

module.exports = app => {
    router.get('/inventories', inventories.getInventory)

    app.use('/api', router);
}