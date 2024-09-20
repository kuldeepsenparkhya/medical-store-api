var router = require('express').Router();
const { offers } = require('../controllers');
const { authJWT, adminAccess } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/offers', authJWT, adminAccess, fileUploader, offers.createOffer)
    router.get('/offers', offers.find)
    router.get('/offers/:id', offers.findOne)

    router.patch('/offers/:id', authJWT, adminAccess, fileUploader, offers.update)
    router.delete('/offers/:id', offers.delete)

    app.use('/api', router);
}