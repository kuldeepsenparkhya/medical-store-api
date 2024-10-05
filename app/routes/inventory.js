const { inventories } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router();

module.exports = app => {
    router.get('/inventories', adminAccess, inventories.getInventory)
    router.get('/inventories/outofstock', adminAccess, inventories.getInventoryOutOfStockSoon)


    app.use('/api', router);
}