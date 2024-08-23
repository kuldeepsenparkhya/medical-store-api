var router = require('express').Router();
const { products } = require('../controllers');
const { filesUploader } = require('../middlewares/fileUpload');

module.exports = app => {

    router.post('/products', filesUploader, products.create)
    router.get('/products', products.find)
    router.get('/products/:id', products.findOne)



    app.use('/api', router);
}