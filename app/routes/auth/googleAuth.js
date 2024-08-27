const router = require('express').Router();
const passport = require('passport');

module.exports = app => {
    // Auth Routes

    
    router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }));

    router.get('/google/callback', passport.authenticate('google', { failureRedirect: '/error' }), (req, res) => {
        // Successful authentication
        res.redirect('/success');
    });


    app.use('/auth', router);
}