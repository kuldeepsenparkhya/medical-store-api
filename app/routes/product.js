var router = require('express').Router();
const { products } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');
const { filesUploader, bulkFileUploadProduct } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/products', authJWT, adminAccess, filesUploader, products.create)
    router.post('/products/bulk/insert', authJWT, adminAccess, bulkFileUploadProduct, products.createBulkProducts)
    router.get('/products/minimum/discounted', products.getMinimumDiscountedProducts)

    router.get('/products', products.find)
    router.get('/all/products', products.getAllProducts)
    router.get('/all/deleted/products', products.getAllDeletedProducts)

    router.get('/products/:id', products.findOne)

    router.delete('/products/:id', authJWT, adminAccess, products.removeProduct)

    router.patch('/products/:id', authJWT, adminAccess, filesUploader, products.update)

    router.get('/products/top/sale', products.getTopSellingProducts)

    router.post('/products/verfy', authJWT, adminAccess, bulkFileUploadProduct, products.verifyUploadedCSVProducts);

    // router.get('/download/report', products.downloadUploadReport);

    router.get('/download/report/success', authJWT, adminAccess,products.downloadSuccessReport);

    router.get('/download/report/error',authJWT, adminAccess, products.downloadErrorReport);

    router.get('/download/products', authJWT, adminAccess, products.generateAndDownloadCSV);

    app.use('/api', router);

}