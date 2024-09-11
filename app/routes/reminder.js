const { reminders } = require('../controllers');

var router = require('express').Router();

module.exports = app => {
    router.post('/reminders', reminders.reminderOrder)


    app.use('/api', router);
}