const { wishLists } = require('../controllers');

var router = require('express').Router();


module.exports = app => {
    router.post('/wishlists', wishLists.create);
    router.get('/wishlists', wishLists.findAllWishLists);
   

    app.use('/api', router);
};