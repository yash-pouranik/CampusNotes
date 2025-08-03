const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require("../models/user")

router.get("/login-n", (req, res) => {
    res.render("auth/login", {title: "Login | campusnotes"});
})


router.get("/register-n", (req, res) => {
    res.render("auth/signup", {title: "Signup | campusnotes"});
})



router.post("/register", async (req, res) => {
  const { username, email, password } = req.body;
  try {
    const user = new User({ username, email, password });
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
    failureMessage: true
  })
);


router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err); // handle error
    res.redirect('/login-n'); // redirect after logout
  });
});

module.exports = router;