const { discounts } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

var router = require('express').Router(); 3



module.exports = app => {
    router.post('/discounts', adminAccess, discounts.create);
    router.get('/discounts', discounts.find);
    router.get('/discounts/:id', adminAccess, discounts.findOne);
    router.patch('/discounts/:id', adminAccess, discounts.handleDiscountStatus);
    router.patch('/remove/discounts/:id', adminAccess, discounts.removeDiscount);

    app.use('/api', router);
};