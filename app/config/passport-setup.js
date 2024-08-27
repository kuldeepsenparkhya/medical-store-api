// app/config/passport-setup.js
const passport = require('passport');
const { User } = require('../modals');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "https://medical-store-api.onrender.com/auth/google/callback"

},
    async (accessToken, refreshToken, profile, done) => {
        const existingUser = await User.findOne({ googleId: profile.id });

        if (existingUser) {

            console.log('existingUser>>>>', existingUser);

            return done(null, existingUser);
        }


        const newUser = await new User({
            socialID: profile.id,
            socialType:'google',
            name: profile.displayName,
            email: profile.emails[0].value,
            role: 'user',
        }).save();

        done(null, newUser);
    }
));

passport.serializeUser((user, done) => {
    done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
    const user = await User.findById(id);
    done(null, user);
});
