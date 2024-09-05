var router = require('express').Router();
const { products } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');
const { filesUploader } = require('../middlewares/fileUpload');

module.exports = app => {

    router.post('/products',adminAccess, filesUploader, products.create)
    router.get('/products', products.find)
    router.get('/all/products', products.getAllTrashProducts)

    router.get('/products/:id', products.findOne)
    router.delete('/products/:id',adminAccess, products.removeProduct)

    router.patch('/products/:id',adminAccess, filesUploader, products.update)

    router.get('/products/top/sale', products.getTopSellingProducts)

    app.use('/api', router);
}