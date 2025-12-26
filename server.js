const express = require("express");
const path = require("path");
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser'); // Require cookie-parser

const app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo'); // <-- YEH LINE ADD KAREIN
const passport = require('passport');
require('dotenv').config();
require('./config/passport'); // path to the passport file
app.use(methodOverride('_method'));

//requiring middleware
const { isModerator } = require("./middlewares")



app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser()); // Use cookie-parser middleware


// **Important: Use express-ejs-layouts middleware before routes**
app.use(expressLayouts);

app.use(express.static(path.join(__dirname, "public")));
// caching for 1 day in user browser
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d', 
  etag: false
}));

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

  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI, // Yeh aapke .env file se connection string le lega
    collectionName: 'sessions', // MongoDB mein collection ka naam
    ttl: 14 * 24 * 60 * 60 // Session kab tak store rahe (7 din)
  }),
  // =======================================

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
  res.locals.currentUrl = `https://campusnotes.bitbros.in${req.path}`;
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
const chatRoutes = require("./routes/chat");


// Corrected code for server.js
app.use('/', notesRoutes); // This line now comes first
app.use('/dashboard', dash);
app.use('/api', apiR);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use("/", reqNotes)
app.use("/", verifyRRoute)
app.use("/", companyRoutes)
app.use("/", chatRoutes); // Register Chat Routes



// Add these variables at the top of your server.js (Global Scope)
let cachedContributors = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24; // Cache for 12 Hour

app.get("/", async (req, res) => {
  try {
    const now = Date.now();

    // 1. Check if we have valid cached data
    if (cachedContributors && (now - lastCacheTime < CACHE_TTL)) {
       return res.render("home/index", {
         title: "CampusNotes | Your Campus, Your Notes - SVVV",
         topContributors: cachedContributors
       });
    }

    // 2. If no cache, run the Optimized Aggregation
    const topContributors = await User.aggregate([
      // Optimization: Only consider users who have notes (Filter first!)
      { $match: { "notes.0": { $exists: true } } }, 

      // Calculate Upload Count
      { $addFields: { uploaded: { $size: "$notes" } } },
      
      { $sort: { uploaded: -1 } },
      { $limit: 3 },

      // Optimization: Fetch ONLY what index.ejs needs
      { $project: {
          name: 1,
          username: 1,
          avatar: 1,
          roles: 1,
          course: 1,
          verification: 1, // Needed for the 'verified' check
          uploaded: 1
      }}
    ]);

    // 3. Update the Cache
    cachedContributors = topContributors;
    lastCacheTime = now;

    res.render("home/index", {
      title: "CampusNotes | Your Campus, Your Notes - SVVV",
      topContributors
    });

  } catch (err) {
    console.error("Home Route Error:", err);
    // Serve stale cache if DB fails, or empty array
    res.render("home/index", {
      title: "CampusNotes",
      topContributors: cachedContributors || []
    });
  }
});


app.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://campusnotes.bitbros.in";

    // 1. Static Pages
    const staticUrls = [
      "/",
      "/explore",
      "/most-downloaded",
      "/requestnotes",
      "/rankings",
      "/login-n",
      "/register-n",
      "/bitbros/aboutus",
      "/faq"
    ];

    // 2. Fetch Dynamic Data (Latest 500 to keep it fast)
    const notes = await Note.find({ isVerified: true }).select("_id updatedAt").limit(500).sort({ updatedAt: -1 });
    const users = await User.find({}).select("_id").limit(200);

    // 3. Generate XML
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
    <urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    // Add Static Pages
    staticUrls.forEach(url => {
      xml += `
        <url>
          <loc>${baseUrl}${url}</loc>
          <changefreq>weekly</changefreq>
          <priority>0.8</priority>
        </url>`;
    });

    // Add Notes
    notes.forEach(note => {
      xml += `
        <url>
          <loc>${baseUrl}/notes/${note._id}</loc>
          <lastmod>${new Date(note.updatedAt).toISOString()}</lastmod>
          <changefreq>monthly</changefreq>
          <priority>0.9</priority>
        </url>`;
    });

    // Add Profiles
    users.forEach(user => {
      xml += `
        <url>
          <loc>${baseUrl}/profile/${user._id}</loc>
          <changefreq>monthly</changefreq>
          <priority>0.6</priority>
        </url>`;
    });

    xml += `</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (err) {
    console.error("Sitemap Error:", err);
    res.status(500).end();
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


const PORT = process.env.PORT || 3000; // Cloud का पोर्ट लो, वरना 3000

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});