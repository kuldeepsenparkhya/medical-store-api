const { orders } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router(); 3
const path = require("path");
const { fileUploader } = require('../middlewares/fileUpload');


module.exports = app => {
    router.post('/orders', fileUploader, orders.create);
    router.get('/orders', orders.findAllOrders);

    router.get('/orders/user/:user_id', adminAccess, orders.findOrdersByUserId);
    router.get('/user/orders', orders.findAllUserOrders);
    router.get('/orders/:id', orders.getOrderById);

    router.delete('/orders/:id', orders.cancelledOrder);

    router.patch('/orders/:id', adminAccess, orders.handleOrderStatus);

    router.post('/checkout', orders.checkout);
    router.get('/payment/:paymentId', orders.payment);
    router.get('/payments', orders.getAllPayments);

    router.get('/sales/report', orders.salesReport);

    // -------------------------- Generate Oder Invoice---------------------------------------------//
    router.get('/invoices/generate/:orderID', orders.downloadInvoice)
    // -----------------------------------------------------------------------//

    app.use('/api', router);
};