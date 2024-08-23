const { auths } = require('../../controllers');

var router = require('express').Router();



module.exports = app => {
    router.post('/login', auths.login)
    router.post('/reset-password', auths.forgotPassword)
    router.post('/update-password', auths.forgotPasswordVerify)
    router.get('/me', auths.me)

    app.use('/api', router);
}