var router = require('express').Router()
const path = require("path");
const { fileUploader } = require('../middlewares/fileUpload');
const { media } = require('../controllers');

module.exports = app => {
    router.get('/media/:name', (req, res) => {
        const { type, name } = req.params
        res.sendFile(path.join(__dirname, `../upload/${name}`,))
    })


    router.post('/products/media/:id', media.addProductMedia)

    router.patch('/products/media/:id', fileUploader, media.updateProductMedia)
    router.delete('/products/media/:id', media.removeProductMediaById)




    app.use('/api', router)
};
