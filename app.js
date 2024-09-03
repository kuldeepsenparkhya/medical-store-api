require('dotenv').config();
const express = require('express');
const passport = require('passport');
const session = require('express-session');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const { authJWT } = require('./app/middlewares/auth');
const { PORT } = require('./app/config/config');
// const HOST = '192.168.0.23';
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
    origin: ["http://localhost:3000", "http://localhost:3001", ' https://janhitchemist.netlify.app','https://janhit-chamist-admin.netlify.app/'],
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
require('./app/routes/auth/auth')(app);
require('./app/routes/addressBook')(app);
require('./app/routes/addToCart')(app);



app.use(authJWT);

require('./app/routes/user')(app);
require('./app/routes/wishList')(app);
require('./app/routes/prescription')(app);

require('./app/routes/order')(app);
require('./app/routes/discount')(app);




app.get('*', (req, res) => {
    res.status(400).send({
        message: 'Hunn smart!',
        error: true,
    });
});

// app.listen(PORT, HOST, () => { console.log(`Server is running port on http://${HOST}:${PORT}`); });
app.listen(PORT, () => { console.log(`Server is running port on http://localhost:${PORT}`); });

