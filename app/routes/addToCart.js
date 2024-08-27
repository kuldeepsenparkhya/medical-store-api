var router = require('express').Router();
const { addTocarts } = require('../controller');


module.exports = app => {
    router.post('/addToCart', addTocarts.create);
    router.get('/addToCart', addTocarts.findAll);


    app.use('/api', router);
};