const { discounts } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

var router = require('express').Router(); 3



module.exports = app => {
    router.post('/discounts', fileUploader, authJWT, adminAccess, discounts.create);
    router.get('/discounts', authJWT, adminAccess, discounts.find);
    router.get('/discounts/:id', discounts.findOne);
    router.patch('/discounts/:id', fileUploader, authJWT, adminAccess, discounts.handleDiscountStatus);
    router.patch('/remove/discounts/:id', authJWT, adminAccess, discounts.removeDiscount);

    app.use('/api', router);
};