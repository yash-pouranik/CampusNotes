const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require("../models/user")
const {notLoggedIn} = require("../middlewares");

router.get("/auth/linkedin", (req, res) => {
  req.flash("success", "Linked Login is currently in development")
  res.redirect("/login-n");
})


router.get("/login-n", notLoggedIn, (req, res) => {
    res.render("auth/login", {title: "Login | campusnotes"});
})


router.get("/register-n", (req, res) => {
 req.flash("success", "It is in Alpha Testing, Just log in with ur given accounts");
  return res.redirect("/login-n")
    res.render("auth/signup", {title: "Signup | campusnotes"});
})



router.post("/register", async (req, res) => {
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
    successRedirect: "/",
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