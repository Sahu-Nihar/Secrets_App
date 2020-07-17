require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require("passport-facebook");
const findOrCreate = require("mongoose-findorcreate");

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));

app.use(session({
    secret: process.env.PASSPORT_SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://localhost:27017/user_DB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

mongoose.set("useCreateIndex", true);

const user_schema = new mongoose.Schema({

    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String
});

user_schema.plugin(passportLocalMongoose);
user_schema.plugin(findOrCreate)

const User = new mongoose.model("User", user_schema);

passport.use(User.createStrategy());

passport.serializeUser(function (user, done) {
    done(null, user.id);
});

passport.deserializeUser(function (id, done) {
    User.findById(id, function (err, user) {
        done(err, user);
    });
});

passport.use(new GoogleStrategy({
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "http://localhost:3000/auth/google/secrets",
        userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
    },
    (accessToken, refreshToken, profile, cb) => {
        console.log(profile);

        User.findOrCreate({
            googleId: profile.id
        }, (err, user) => {
            return cb(err, user);
        });
    }
));

passport.use(new FacebookStrategy({
        clientID: process.env.FB_APP_ID,
        clientSecret: process.env.FB_SECRET,
        callbackURL: "http://localhost:3000/auth/facebook/secrets"
    },
    (accessToken, refreshToken, profile, cb) => {
        console.log(profile);

        User.findOrCreate({
            facebookId: profile.id
        }, (err, user) => {
            return cb(err, user);
        });
    }
));

app.get("/", (req, res) => {

    res.render("home");
});

app.get("/auth/google",
    passport.authenticate("google", {
        scope: ["profile"]
    }));


app.get("/auth/google/secrets",

    passport.authenticate("google", {
        failureRedirect: "/login"
    }),
    (req, res) => {
        // Successful authentication, redirect secrets.
        res.redirect("/secrets");
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', {
        failureRedirect: '/login'
    }),
    function (req, res) {
        // Successful authentication, redirect home.
        res.redirect('/secrets');
    });


app.route("/login")
    .get((req, res) => {

        res.render("login")
    })
    .post((req, res) => {

        const user = new User({

            username: req.body.username,
            password: req.body.password
        });

        req.login(user, (err) => {

            if (err) {
                console.log(err);
            } else {

                passport.authenticate("local")(req, res, () => {

                    res.redirect("/secrets");
                });
            }
        });
    });


app.route("/register")
    .get((req, res) => {

        res.render("register")
    })
    .post((req, res) => {

        User.register({
            username: req.body.username
        }, req.body.password, (err, user) => {

            if (err) {
                console.log(err);
                res.redirect("/register");
            } else {
                passport.authenticate("local")(req, res, () => {

                    res.redirect("/secrets");
                });
            }
        });

    });


app.get("/secrets", (req, res) => {

    User.find({
        "secret": {
            $ne: null
        }
    }, (err, found_users) => {

        if (err) {
            console.log(err);
        } else {
            if (found_users) {
                res.render("secrets", {
                    users_with_secrets: found_users
                });
            }
        }
    });
});

app.route("/submit")
    .get((req, res) => {

        if (req.isAuthenticated()) {
            res.render("submit");
        } else {
            res.redirect("/login");
        }
    })
    .post((req, res) => {

        const submitted_secret = req.body.secret

        console.log(req.user);

        User.findById(req.user._id, (err, found_user) => {

            if (err) {
                console.log(err);
            } else {
                if (found_user) {
                    found_user.secret = submitted_secret;
                    found_user.save(() => {
                        res.redirect("/secrets");
                    });
                }
            }
        });
    });

app.get("/logout", (req, res) => {

    req.logout();
    res.redirect("/");
});


app.listen(3000, () => {

    console.log("Server is up and running at port 3000.")
});