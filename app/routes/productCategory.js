var router = require('express').Router();
const { productCategories } = require('../controllers');

module.exports = app => {

    router.post('/product/categories', productCategories.create)
    router.get('/product/categories', productCategories.find)
    router.get('/product/categories/:id', productCategories.findOne)
    router.patch('/product/categories/:id', productCategories.update)
    router.delete('/product/categories/:id', productCategories.delete)





    app.use('/api', router);
}