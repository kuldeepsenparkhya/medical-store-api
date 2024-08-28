const { addToCarts } = require('../controllers');

var router = require('express').Router();


module.exports = app => {
    router.post('/addToCart', addToCarts.create);
    router.get('/addToCart', addToCarts.findAll);
    router.patch('/addToCart/:id', addToCarts.updateCart);
    router.delete('/addToCart/:id', addToCarts.delete);




    app.use('/api', router);
};