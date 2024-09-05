const { orders } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router(); 3


module.exports = app => {
    router.post('/orders', orders.create);
    router.get('/orders',adminAccess, orders.findAllOrders);

    router.get('/orders/user/:user_id',adminAccess, orders.findOrdersByUserId);

    router.get('/user/orders', orders.findAllUserOrders);

    router.get('/orders/:id', orders.getOrderById);

    router.delete('/orders/:id', orders.cancelledOrder);

    router.patch('/orders/:id', adminAccess, orders.handleCancelledOrder);

    app.use('/api', router);
};