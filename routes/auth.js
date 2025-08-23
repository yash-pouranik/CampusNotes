const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require("../models/user")
const {notLoggedIn} = require("../middlewares");
const { OAuth2Client } = require("google-auth-library");


const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

router.post("/oauth2callback", async (req, res) => {
  try {
    const ticket = await client.verifyIdToken({
      idToken: req.body.credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    const payload = ticket.getPayload();

    let user = await User.findOne({ email: payload.email });

    if (!user) {
      user = await User.create({
        username: payload.email.split("@")[0], // simple username
        name: payload.name,
        email: payload.email,
        avatar: payload.picture,
        course: "B.Tech CSE", // or default
        password: Math.random().toString(36).slice(-8), // dummy, will be hashed
      });
    }

    req.login(user, (err) => {
      if (err) throw err;
      console.log("loggedin");
      res.json({ success: true, userId: user._id }); // send JSON
    });

  } catch (err) {
    console.error("Google login error:", err);
    res.status(401).send("Login failed");
  }
});





router.get("/auth/linkedin", (req, res) => {
  req.flash("success", "Linkedin Login is currently in development")
  res.redirect("/login-n");
})




router.get("/login-n", notLoggedIn, (req, res) => {
    res.render("auth/login", {title: "Login | campusnotes"});
})


router.get("/register-n", notLoggedIn, (req, res) => {
    res.render("auth/signup", {title: "Signup | campusnotes"});
})



router.post("/register", notLoggedIn, async (req, res) => {
  const { username, email, password, course, name, gender } = req.body;
  try {
    const user = new User({ username, name, email, password, course, gender });
    await user.save();
    res.redirect("/");
  } catch (err) {
    res.send("Error: " + err.message);
  }
});


router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/explore",
    failureRedirect: "/login-n",
    failureFlash: true // this sends the message to req.flash("error")
  })
);



router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err); // handle error
    res.redirect('/login-n'); // redirect after logout
  });
});

module.exports = router;