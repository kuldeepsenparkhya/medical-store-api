var router = require('express').Router();
const { users } = require('../controllers');
const { adminAccess } = require('../middlewares/auth');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    router.post('/register', users.create)
    router.get('/users', adminAccess, users.find)
    router.get('/users/:id', adminAccess, users.findOne)
    router.patch('/users/changepassword', users.changePassword)
    router.patch('/users/:id', adminAccess, fileUploader, users.update)

    router.patch('/update/profile', fileUploader, users.updateProfile)
    router.get('/me', users.me)

    app.use('/api', router);
}






