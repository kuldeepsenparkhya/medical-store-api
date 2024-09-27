var router = require('express').Router();
const { vollets } = require('../controllers');

module.exports = app => {

    router.get('/wallets', vollets.getVollet)


    app.use('/api', router);
}