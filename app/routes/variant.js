var router = require('express').Router();
const { produtVariants } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');

module.exports = app => {

    router.post('/variants', authJWT, adminAccess, produtVariants.create)


    app.use('/api', router);
}