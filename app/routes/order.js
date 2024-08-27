var router = require('express').Router();3

const { orders } = require('../controller');


module.exports = app => {
    router.post('/orders', orders.create);
    router.get('/orders', orders.findAllOrders);
   
    router.get('/orders/:orderID', orders.downloadInvoice);

    app.use('/api', router);
};