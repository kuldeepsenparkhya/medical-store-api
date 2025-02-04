var router = require('express').Router();
const { documents } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');

module.exports = app => {
    router.get('/documents/privacyPolicy', documents.getPrivacyPolicy);
    router.get('/documents/terms-of-conditions', documents.getTemsOfConditions);    
    router.get('/documents/data-deletion-instructions', documents.getDataDeletionInstructions);

    router.post('/documetns', adminAccess, documents.createDocument)
    router.post('/documents/get', documents.getDocument); // Changed to /documents/get for consistency
    router.patch('/documents/:id', adminAccess, documents.updateDocument); // Added update route

    app.use('/api', router);
}