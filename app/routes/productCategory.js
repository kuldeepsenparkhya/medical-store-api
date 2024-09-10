var router = require('express').Router();
const { productCategories } = require('../controllers');
const { authJWT, adminAccess } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/product/categories', authJWT, adminAccess, fileUploader, productCategories.create)
    router.get('/product/categories', productCategories.find)
    router.get('/product/categories/:id', productCategories.findOne)
    router.patch('/product/categories/:id', authJWT, adminAccess, fileUploader, productCategories.update)
    router.delete('/product/categories/:id', authJWT, adminAccess, productCategories.delete)

    app.use('/api', router);
}