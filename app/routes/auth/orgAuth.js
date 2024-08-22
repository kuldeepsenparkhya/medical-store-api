const { orgnizationAuths } = require('../../controllers');

var router = require('express').Router();



module.exports = app => {
    router.post('/organizations/login', orgnizationAuths.orgLogin)

    router.patch('/organizations/reset-password', orgnizationAuths.orgForgotPassword)
    router.patch('/organizations/update-password', orgnizationAuths.orgForgotPasswordVerify)

    router.get('/organizations/me', orgnizationAuths.orgMe)


    app.use('/api', router);
}