var router = require('express').Router();
const { wishLists } = require('../controller');


module.exports = app => {
    router.post('/wishlists', wishLists.create);
    router.get('/wishlists', wishLists.findAllWishLists);
   

    app.use('/api', router);
};