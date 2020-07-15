require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const saltRounds = 10;

const app = express();

app.use(express.static("public"));

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
    extended: true
}));


mongoose.connect("mongodb://localhost:27017/user_DB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const user_schema = new mongoose.Schema({

    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});


const User = new mongoose.model("User", user_schema);

app.get("/", (req, res) => {

    res.render("home");
});

app.get("/login", (req, res) => {

    res.render("login")
});

app.get("/register", (req, res) => {

    res.render("register")
});

app.post("/register", (req, res) => {

    bcrypt.hash(req.body.password, saltRounds, (err, hash) => {

        const new_user = new User({
            email: req.body.username,
            password: hash
        });

        new_user.save((err) => {
            if (err) {
                console.log(err);
            } else {
                res.render("secrets");
            }
        });
    });

});

app.post("/login", (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    User.findOne({
        email: username
    }, (err, found_user) => {

        if (err) {
            console.log(err);
        } else {
            if (found_user) {
                bcrypt.compare(password, found_user.password, (err, result) => {

                    if (result === true) {
                        res.render("secrets");
                    }
                });
            }
        }
    });
});


app.listen(3000, () => {

    console.log("Server is up and running at port 3000.")
});