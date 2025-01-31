var router = require('express').Router();

module.exports = app => {
    router.get('/create-payment', orders.getAllPayments);


    app.use('/api', router);
};