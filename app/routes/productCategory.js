var router = require('express').Router();
const { productCategories } = require('../controllers');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {

    router.post('/product/categories',fileUploader, productCategories.create)
    router.get('/product/categories', productCategories.find)
    router.get('/product/categories/:id', productCategories.findOne)
    router.patch('/product/categories/:id',fileUploader, productCategories.update)
    router.delete('/product/categories/:id', productCategories.delete)





    app.use('/api', router);
}