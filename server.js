const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");

const app = express();
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/passport'); // path to the passport file



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

// **Important: Use express-ejs-layouts middleware before routes**
app.use(expressLayouts);

app.use(express.static(path.join(__dirname, "public")));

//db
const connectDB = require('./config/db');
connectDB();




//auth
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
  }
}));


app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});





const authRoutes = require('./routes/auth');
app.use('/', authRoutes);




app.get("/", (req, res) => {
  console.log(req.user)
  res.render("home/index", { title: "CampusNotes" });
});

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
