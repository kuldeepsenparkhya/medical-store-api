var router = require('express').Router();
const { brands } = require('../controllers');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {

    router.post('/brands', fileUploader, brands.create)
    router.get('/brands', brands.find)
    router.get('/brands/:id', brands.findOne)
    router.patch('/brands/:id', brands.update)
    router.delete('/brands/:id', brands.delete)

    app.use('/api', router);
}