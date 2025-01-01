require('dotenv').config();
const express = require('express');

const cron = require("node-cron");

const passport = require('passport');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { authJWT } = require('./app/middlewares/auth');
const { PORT } = require('./app/config/config');
const { reminderOrder } = require('./app/controllers/reminder');
const { User } = require('./app/modals');
const { sendMailer, remindeEmail, sendRemindMailer } = require('./app/utils/helper');

// const HOST = '192.168.0.118';
// Initialize Passport

require('./app/config/passport-setup'); // Ensure this is required to initialize Passport

const app = express();

app.set('view engine', 'ejs');

app.use(session({
    resave: false,
    saveUninitialized: true,
    secret: 'SECRET'
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(express.static(path.join(__dirname, "public")));

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001",'http://18.233.85.48','http://18.233.85.48:3000', 'https://janhit-chemist.netlify.app', 'https://janhit-chamist-admin.netlify.app'],
    methods: ["GET", "POST", "HEAD", "PUT", "PATCH", "DELETE"],
    credentials: true
}));

app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '50mb' }));
app.use(morgan('tiny'));

// Route setup
require('./app/routes/auth/googleAuth')(app);
require('./app/routes/media')(app);
require('./app/routes/broucher')(app);

require('./app/routes/product')(app);
require('./app/routes/brand')(app);
require('./app/routes/productCategory')(app);
require('./app/routes/healthCategory')(app);

require('./app/routes/auth/auth')(app);
require('./app/routes/addressBook')(app);
require('./app/routes/addToCart')(app);

require('./app/routes/discount')(app);
require('./app/routes/reminder')(app);
require('./app/routes/offer')(app);


app.use(authJWT);

require('./app/routes/document')(app);


require('./app/routes/user')(app);
require('./app/routes/wishList')(app);
require('./app/routes/prescription')(app);

require('./app/routes/order')(app);

require('./app/routes/inventory')(app);
require('./app/routes/variant')(app);
require('./app/routes/coin')(app);
require('./app/routes/vollet')(app);


// Creating a cron job which runs every hour
cron.schedule("0 * * * *", async function () {
    // Creating a cron job which runs every 5 seconds
    // cron.schedule("0 0 * * *", async function () {
    // cron.schedule("*/10 * * * * *", async function () {
    try {
        const getUsers = await reminderOrder();
        const subject = 'Reminder: Your Order';
        // Resolve customer emails
        const customerEmails = await Promise.all(getUsers?.map(async (item) => {
            if (item.count >= 2) {
                const user = await User.findOne({ _id: item.user_id });
                if (user) {

                    const message = await remindeEmail(user.name);
                    // await sendRemindMailer(user.email, subject, message);
                    return user.email;
                }
            }
            return null; // Return null if no email is found
        }));
        console.log("Running a task every 5 seconds", getUsers);
    } catch (error) {
        console.error('Error occurred while processing reminder orders:', error);
    }
});

app.get('*', (req, res) => {
    res.status(400).send({
        message: 'Hunn smart!',
        error: true,
    });
});

// app.listen(PORT, HOST, () => { console.log(`Server is running port on http://${HOST}:${PORT}`); });
app.listen(PORT, () => { console.log(`Server is running port on http://localhost:${PORT}`); });

