var router = require('express').Router();
const { brands } = require('../controllers');
const { authJWT, adminAccess } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/brands', authJWT, adminAccess, fileUploader, brands.create)
    router.get('/brands', brands.find)
    router.get('/brands/:id', brands.findOne)
    router.patch('/brands/:id', authJWT, adminAccess, fileUploader, brands.update)
    router.delete('/brands/:id', authJWT, adminAccess, brands.delete)

    app.use('/api', router);
}