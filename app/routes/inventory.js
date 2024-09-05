const { inventories } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router();

module.exports = app => {
    router.get('/inventories', adminAccess, inventories.getInventory)

    app.use('/api', router);
}