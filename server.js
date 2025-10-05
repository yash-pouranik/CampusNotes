const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser'); // Require cookie-parser

const app = express();
const session = require('express-session');
const passport = require('passport');
require('dotenv').config();
require('./config/passport'); // path to the passport file
app.use(methodOverride('_method'));

//requiring middleware
const {isModerator} = require("./middlewares")



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware


// **Important: Use express-ejs-layouts middleware before routes**
app.use(expressLayouts);

app.use(express.static(path.join(__dirname, "public")));

//db
const connectDB = require('./config/db');
connectDB();

//dbs
const User = require("./models/user");  // or correct path
const Note = require('./models/note');





//auth
app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000  // 7 days in milliseconds
  }
}));

app.use(flash());


app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currUser = req.user;
  res.locals.success_msg = req.flash("success");
  res.locals.error_msg = req.flash("error");
  next();
});




app.get('/health/campnotes', (req, res) => {
  res.status(200).send('OK');
});


const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const notesRoutes = require('./routes/notes');
const verifyRRoute = require("./routes/verify");
const reqNotes = require("./routes/reqNotes");
const companyRoutes = require("./routes/company")
const apiR = require("./routes/api")
const dash = require("./routes/adminRoutes");


// Corrected code for server.js
app.use('/', notesRoutes); // This line now comes first
app.use('/dashboard', dash);
app.use('/api', apiR);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use("/", reqNotes)
app.use("/", verifyRRoute)
app.use("/", companyRoutes)



app.get("/", async (req, res) => {
  try {
    const topContributors = await User.aggregate([
      { $addFields: { uploaded: { $size: "$notes" } } },
      { $sort: { uploaded: -1 } },
      { $limit: 3 }
    ]);

    res.render("home/index", {
      title: "CampusNotes | Your Campus, Your Notes - SVVV",
      topContributors
    });
  } catch (err) {
    console.error(err);
    res.render("home/index", {
      title: "CampusNotes",
      topContributors: []
    });
  }
});





//404
// 404 Page Not Found handler
app.use((req, res) => {
  res.status(404).render("errors/404", {
    title: "Page Not Found | CampusNotes",
    showAds: false
  });
});






app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});