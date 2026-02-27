const express = require('express');
const passport = require('passport');
const router = express.Router();
const User = require("../models/user")
const { notLoggedIn } = require("../middlewares");
const { OAuth2Client } = require("google-auth-library");

const {addEmailJob} = require("../queues/otp.queue")


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
  res.render("auth/login", { title: "Login | campusnotes", showAds: false });
})


router.get("/register-n", notLoggedIn, (req, res) => {
  res.render("auth/signup", { title: "Signup | campusnotes", showAds: false });
})



router.post("/register", notLoggedIn, async (req, res) => {
  const { username, email, password, course, name, gender } = req.body;
  try {
    // Check if username or email already exists
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });

    if (existingUser) {
      req.flash("error", "Username or email already exists. Please try a different one.");
      return res.redirect("/register-n");
    }

    // Create new user
    const user = new User({
      username,
      name,
      email: email.toLowerCase(),
      password,
      course,
      gender
    });
    await user.save();

    req.flash("success", "Account created successfully! Please login.");
    res.redirect("/login-n");
  } catch (err) {
    // Log error server-side for debugging
    console.error("Registration error:", err);

    // Send generic error message to user
    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/register-n");
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
    req.flash("success", "Logged you out successfully!");
    res.redirect('/login-n'); // redirect after logout
  });
});

// forgot page
router.get("/forgot", (req, res) => {
  res.render("auth/forgot", { step: "email", title: "forgot password", showAds: false });
});



// send otp
router.post("/forgot/send-otp", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("auth/forgot", {
      step: "email",
      flash: { type: "error", message: "Email not registered." },
      title: "forgot password"
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  user.resetOtp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000; // 10min
  await user.save();

  console.log("OTP for", email, "is", otp);
  const data = {
    user: user,
    otp: otp
  };
  addEmailJob(data, 5000)

  res.render("auth/forgot", {
    step: "otp",
    email,
    flash: { type: "success", message: "OTP sent to your email." },
    title: "forgot password"
  });
});



// verify otp + change password
router.post("/forgot/verify", async (req, res) => {
  const { email, otp, password, confirmPassword } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    return res.render("auth/forgot", {
      step: "email",
      flash: { type: "error", message: "Invalid request." },
      title: "forgot password"
    });
  }

  if (password.trim() !== confirmPassword.trim()) {
    return res.render("auth/forgot", {
      step: "otp",
      email,
      flash: { type: "error", message: "Passwords do not match." },
      title: "forgot password"
    });
  }

  if (
    String(user.resetOtp) !== String(otp) ||
    !user.otpExpiry ||
    user.otpExpiry < Date.now()
  ) {
    return res.render("auth/forgot", {
      step: "otp",
      email,
      flash: { type: "error", message: "Invalid or expired OTP." },
      title: "forgot password"
    });
  }

  const passwordRegex = /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/;

  if (!passwordRegex.test(req.body.password)) {
    req.flash("error", "Password must be 8+ chars, include uppercase, number, and special character.");
    return res.redirect("/forgot");
  }


  // 🚀 yaha plain-text set kar do, schema hook auto-hash karega
  user.password = password;
  user.resetOtp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  req.flash("success", "Password changed successfully, now login!");
  res.redirect("/login-n");
});



// resend otp
router.post("/forgot/resend", async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    return res.render("auth/forgot", {
      step: "email",
      flash: { type: "error", message: "Email not registered." },
      title: "forgot password"
    });
  }

  const otp = Math.floor(100000 + Math.random() * 900000);
  user.resetOtp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  console.log("Resent OTP for", email, "is", otp);

  res.render("auth/forgot", {
    step: "otp",
    email,
    flash: { type: "success", message: "OTP resent successfully." },
    title: "forgot password"
  });
});

module.exports = router;
