const { prescriptions } = require('../controllers');
const { fileUploader } = require('../middlewares/fileUpload');

var router = require('express').Router();

module.exports = app => {

    router.post('/prescriptions', fileUploader, prescriptions.create)
    router.get('/prescriptions', prescriptions.find)
    router.get('/prescriptions/:userID', prescriptions.findUserPrescription)

    router.get('/prescriptions/:id', prescriptions.findOne)
    
    router.patch('/prescriptions/:id', prescriptions.handlePrescriptionRequest)

    router.patch('/update/prescriptions/:id', prescriptions.update)

    router.delete('/remove/prescriptions/:id', prescriptions.handleDeletePrescriptions)

    // router.delete('/prescriptions/:id', prescriptions.delete)

    app.use('/api', router);
}