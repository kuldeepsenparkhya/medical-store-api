var router = require('express').Router();
const { productCategories } = require('../controllers');

module.exports = app => {

    router.post('/product/categories', productCategories.create)
    router.get('/product/categories', productCategories.find)


    app.use('/api', router);
}