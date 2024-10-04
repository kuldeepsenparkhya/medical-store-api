var router = require('express').Router();
const { coins } = require('../controllers');
const { adminAccess, authJWT } = require('../middlewares/auth');

module.exports = app => {
    router.post('/loyalities', authJWT, adminAccess, coins.addCoins)
    router.get('/loyalities', authJWT, coins.getCoin)
    router.patch('/loyalities/:id', authJWT, adminAccess, coins.updateCoinConversion)

    app.use('/api', router);
}