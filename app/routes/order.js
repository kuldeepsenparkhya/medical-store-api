const { orders } = require('../controllers');

var router = require('express').Router();3



module.exports = app => {
    router.post('/orders', orders.create);
    router.get('/orders', orders.findAllOrders);
    router.get('/orders/:id', orders.getOrderById);
   
    // router.get('/orders/:orderID', orders.downloadInvoice);

    app.use('/api', router);
};