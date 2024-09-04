var router = require('express').Router();
const { products } = require('../controllers');
const { filesUploader } = require('../middlewares/fileUpload');

module.exports = app => {

    router.post('/products', filesUploader, products.create)
    router.get('/products', products.find)
    router.get('/all/products', products.getAllTrashProducts)

    router.get('/products/:id', products.findOne)
    router.delete('/products/:id', products.removeProduct)

    router.patch('/products/:id', filesUploader, products.update)

    router.get('/products/top/sale', products.getTopSellingProducts)

    app.use('/api', router);
}