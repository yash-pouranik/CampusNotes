const express = require("express");
const path = require('path');
const expressLayouts = require("express-ejs-layouts");
const flash = require("connect-flash");
const methodOverride = require('method-override');
const cookieParser = require('cookie-parser');

const app = express();
const session = require('express-session');
const MongoStore = require('connect-mongo');
const passport = require('passport');
require('dotenv').config();
require('./config/passport');
app.use(methodOverride('_method'));

const otp_worker = require("./worker/otp.worker");
const email_worker = require("./worker/bulkEmail.worker");
const description_worker = require("./worker/description.worker");

const { isModerator } = require("./middlewares")


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cookieParser());


app.use(expressLayouts);

app.use(express.static(path.join(__dirname, "public")));
app.use(express.static(path.join(__dirname, "public"), {
  maxAge: '1d', 
  etag: false
}));

const connectDB = require('./config/db');
connectDB();

const User = require("./models/user"); 
const Note = require('./models/note');


app.use(session({
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: true,

  store: MongoStore.create({
    mongoUrl: process.env.MONGODB_URI, 
    collectionName: 'sessions', 
    ttl: 14 * 24 * 60 * 60  
  }),

  cookie: {
    maxAge: 7 * 24 * 60 * 60 * 1000  
  }
}));

app.use(flash());


app.use(passport.initialize());
app.use(passport.session());

app.use((req, res, next) => {
  if (req.query.source) {
    res.cookie('utm_source', req.query.source, { maxAge: 24 * 60 * 60 * 1000 });
  } else if (!req.cookies.utm_source && req.headers.referer) {
    try {
      const referer = new URL(req.headers.referer);
      if (!referer.hostname.includes('campusnotes') && !referer.hostname.includes('localhost')) {
        res.cookie('utm_source', referer.hostname, { maxAge: 24 * 60 * 60 * 1000 });
      }
    } catch (e) {}
  }
  next();
});

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


app.use('/', notesRoutes); 
app.use('/dashboard', dash);
app.use('/api', apiR);
app.use('/', authRoutes);
app.use('/', userRoutes);
app.use("/", reqNotes)
app.use("/", verifyRRoute)
app.use("/", companyRoutes)
app.use("/", chatRoutes); 


let cachedContributors = null;
let lastCacheTime = 0;
const CACHE_TTL = 1000 * 60 * 60 * 24;

app.get("/", async (req, res) => {
  try {
    const now = Date.now();

    if (cachedContributors && (now - lastCacheTime < CACHE_TTL)) {
       return res.render("home/index", {
         title: "CampusNotes | Your Campus, Your Notes - SVVV",
         topContributors: cachedContributors
       });
    }

    const topContributors = await User.aggregate([
      { $match: { "notes.0": { $exists: true } } }, 
      { $addFields: { uploaded: { $size: "$notes" } } },
      
      { $sort: { uploaded: -1 } },
      { $limit: 3 },

      { $project: {
          name: 1,
          username: 1,
          avatar: 1,
          roles: 1,
          course: 1,
          verification: 1, 
          uploaded: 1
      }}
    ]);

    cachedContributors = topContributors;
    lastCacheTime = now;

    res.render("home/index", {
      title: "CampusNotes | Your Campus, Your Notes - SVVV",
      topContributors
    });

  } catch (err) {
    console.error("Home Route Error:", err);
    res.render("home/index", {
      title: "CampusNotes",
      topContributors: cachedContributors || []
    });
  }
});


app.get("/robots.txt", (req, res) => {
  res.type("text/plain");
  res.send(
`User-agent: *
Allow: /
Disallow: /dashboard/
Disallow: /admin/
Disallow: /api/
Disallow: /chat
Disallow: /health/

Sitemap: https://campusnotes.bitbros.in/sitemap.xml`
  );
});

app.get("/sitemap.xml", async (req, res) => {
  try {
    const baseUrl = "https://campusnotes.bitbros.in";

    const staticUrls = [
      { url: "/", priority: "1.0", changefreq: "daily" },
      { url: "/explore", priority: "0.9", changefreq: "daily" },
      { url: "/explore?course=B.Tech+CSE", priority: "0.8", changefreq: "weekly" },
      { url: "/explore?course=B.Tech+IT", priority: "0.8", changefreq: "weekly" },
      { url: "/explore?course=MBA", priority: "0.7", changefreq: "weekly" },
      { url: "/explore?course=BBA", priority: "0.7", changefreq: "weekly" },
      { url: "/explore?course=MCA", priority: "0.7", changefreq: "weekly" },
      { url: "/explore?course=BCA", priority: "0.7", changefreq: "weekly" },
      { url: "/most-downloaded", priority: "0.8", changefreq: "daily" },
      { url: "/requestnotes", priority: "0.7", changefreq: "weekly" },
      { url: "/rankings", priority: "0.7", changefreq: "weekly" },
      { url: "/login-n", priority: "0.5", changefreq: "monthly" },
      { url: "/register-n", priority: "0.5", changefreq: "monthly" },
      { url: "/bitbros/aboutus", priority: "0.6", changefreq: "monthly" },
      { url: "/faq", priority: "0.6", changefreq: "monthly" }
    ];

    const notes = await Note.find({ isVerified: { $ne: false } })
      .select("_id slug updatedAt createdAt")
      .limit(1000)
      .sort({ updatedAt: -1 });

    const users = await User.find({}).select("_id").limit(200);

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`;

    staticUrls.forEach(item => {
      xml += `
  <url>
    <loc>${baseUrl}${item.url}</loc>
    <changefreq>${item.changefreq}</changefreq>
    <priority>${item.priority}</priority>
  </url>`;
    });

    notes.forEach(note => {
      const noteIdentifier = note.slug || note._id;
      const lastModDate = note.updatedAt || note.createdAt || new Date();
      xml += `
  <url>
    <loc>${baseUrl}/notes/${noteIdentifier}</loc>
    <lastmod>${new Date(lastModDate).toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    });

    users.forEach(user => {
      xml += `
  <url>
    <loc>${baseUrl}/profile/${user._id}</loc>
    <changefreq>weekly</changefreq>
    <priority>0.5</priority>
  </url>`;
    });

    xml += `
</urlset>`;

    res.header("Content-Type", "application/xml");
    res.send(xml);

  } catch (err) {
    console.error("Sitemap Error:", err);
    res.status(500).end();
  }
});


app.use((req, res) => {
  res.status(404).render("errors/404", {
    title: "Page Not Found | CampusNotes",
    showAds: false
  });
});


const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});