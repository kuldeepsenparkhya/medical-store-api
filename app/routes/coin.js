var router = require('express').Router();
const { coins } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');

module.exports = app => {
    router.post('/loyality', authJWT, adminAccess, coins.updateCoinConversion)
    router.get('/loyality', coins.getCoin)

    app.use('/api', router);
}