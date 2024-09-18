var router = require('express').Router();
const { healthCategories } = require('../controllers');
const { authJWT, adminAccess } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/health/categories', authJWT, adminAccess, fileUploader, healthCategories.create)
    router.get('/health/categories', healthCategories.find)
    router.get('/health/categories/:id', healthCategories.findOne)
    router.patch('/health/categories/:id', authJWT, adminAccess, fileUploader, healthCategories.update)
    router.delete('/health/categories/:id', authJWT, adminAccess, healthCategories.delete)

    app.use('/api', router);
}