const router = require('express').Router();
const passport = require('passport');
const jwt = require('jsonwebtoken');
const { JWT_SECREATE, JWT_EXPIRESIN } = require('../../config/config');

module.exports = app => {
    // Auth Routes
    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/error' }), (req, res) => {
        const token = jwt.sign({
            email: res.req.user.email,
            name: res.req.user.name,
            role: res.req.user.role,
        }, JWT_SECREATE, { expiresIn: JWT_EXPIRESIN })

        res.status(200).send({
            token: token,
            role: res.req.user.role,
            message: 'LoggedIn Successfully',
            error: false
        })
    });


    app.use('/auth', router);
}