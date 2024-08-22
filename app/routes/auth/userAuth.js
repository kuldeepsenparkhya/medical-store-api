const { userAuths } = require('../../controllers');

var router = require('express').Router();



module.exports = app => {
    router.post('/login', userAuths.login)

    router.post('/reset-password', userAuths.forgotPassword)
    router.post('/update-password', userAuths.forgotPasswordVerify)

    router.get('/me', userAuths.me)


    app.use('/api', router);
}