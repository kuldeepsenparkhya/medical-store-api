var router = require('express').Router();
const { coins } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');

module.exports = app => {
    router.patch('/loyalities/:id', authJWT, adminAccess, coins.updateCoinConversion)
    router.post('/loyalities', authJWT, adminAccess, coins.addCoins)

    router.get('/loyalities', coins.getCoin)

    app.use('/api', router);
}