const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");


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





const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const notesRoutes = require('./routes/notes');
const verifyRRoute = require("./routes/verify");

app.use('/', notesRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use("/", verifyRRoute)



app.get("/", async (req, res) => {
  try {
    const topContributors = await User.find({})
          .sort({ uploaded: -1 }) // sort by most uploaded notes
          .limit(3);

    console.log(topContributors)
    res.render("home/index", {
      title: "CampusNotes",
      topContributors,
    });
  } catch (err) {
    console.error(err);
    res.render("home/index", {
      title: "CampusNotes",
      topContributors: [],
    });
  }
});


app.get("/admin/verify-requests", async (req, res) => {
  const unverifiedUsers = await User.find({ verified: false, verificationDoc: { $exists: true } });
  res.render("admin/verify-list", { unverifiedUsers, title: "Verify? | CampusNotes" });
});

app.post("/admin/verify/:id", async (req, res) => {
  await User.findByIdAndUpdate(req.params.id, { verified: true });
  req.flash("success", "User verified successfully!");
  res.redirect("/admin/verify-requests");
});












app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
