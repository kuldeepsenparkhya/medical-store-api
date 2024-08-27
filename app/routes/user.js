var router = require('express').Router();
const { users } = require('../controllers');
const { fileUploader } = require('../middlewares/fileUpload');

module.exports = app => {
    
    router.post('/register', users.create)

    
    router.get('/users', users.find)
    router.get('/users/:id', users.findOne)

    router.patch('/users/:id', users.update)
    // router.delete('/users/:id', users.delete)
    // router.get('/getTotalUsers', users.getTotalUsers)
    router.patch('/update/profile', users.updateProfile)

    app.use('/api', router);
}






