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


app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  res.locals.currUser = req.user;
  next();
});





const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/user');
const notesRoutes = require('./routes/notes');

app.use('/', notesRoutes);
app.use('/', authRoutes);
app.use('/', userRoutes);




app.get("/", async (req, res) => {
  try {
    const topContributors = await Note.aggregate([
      {
        $group: {
          _id: "$uploadedBy",
          uploadCount: { $sum: 1 }
        }
      },
      { $sort: { uploadCount: -1 } },
      { $limit: 3 },
      {
        $lookup: {
          from: "users", // your collection name may differ
          localField: "_id",
          foreignField: "_id",
          as: "userDetails"
        }
      },
      { $unwind: "$userDetails" },
      {
        $project: {
          username: "$userDetails.username",
          course: "$userDetails.course",
          avatar: "$userDetails.avatar", // if available, else default
          uploadCount: 1
        }
      }
    ]);

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

app.listen(3000, () => {
  console.log("Server running on http://localhost:3000");
});
