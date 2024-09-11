var router = require('express').Router();
const { vollets } = require('../controllers');

module.exports = app => {

    router.get('/vollets', vollets.getVollet)


    app.use('/api', router);
}