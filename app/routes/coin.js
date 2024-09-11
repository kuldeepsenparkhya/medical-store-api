var router = require('express').Router();
const { coins } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');

module.exports = app => {
    router.patch('/loyalities', authJWT, adminAccess, coins.updateCoinConversion)
    router.get('/loyalities', coins.getCoin)

    app.use('/api', router);
}