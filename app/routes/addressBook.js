var router = require('express').Router();
const { addressBooks } = require('../controllers');

module.exports = app => {
    router.post('/address', addressBooks.create)
    router.get('/address/:id', addressBooks.findAddressByUserID)
    router.patch('/address/:id', addressBooks.updateAddress)

    router.get('/getaddress/:addressId', addressBooks.findOne)
    router.delete('/trash/address/:id', addressBooks.trashAddress)

    app.use('/api', router);
}






