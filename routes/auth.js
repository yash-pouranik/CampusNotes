const express = require('express');
const crypto = require('crypto');
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
      const baseUsername = payload.email.split("@")[0];

      // Retry loop to handle username collision atomically (avoids TOCTOU race)
      const MAX_RETRIES = 5;
      for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
        try {
          const username = attempt === 0
            ? baseUsername
            : `${baseUsername}_${crypto.randomBytes(3).toString('hex')}`;

          user = await User.create({
            username,
            name: payload.name,
            email: payload.email,
            avatar: payload.picture,
            course: "B.Tech CSE",
            password: crypto.randomBytes(32).toString('hex'),
          });
          break;
        } catch (err) {
          if (err.code === 11000 && err.keyPattern?.username) {
            if (attempt < MAX_RETRIES - 1) continue;
            // All retries exhausted — this is a server-side issue, not an auth failure
            const redactedEmail = crypto.createHash('sha256').update(payload.email).digest('hex').slice(0, 12);
            console.error("Username allocation exhausted for user [hash:", redactedEmail, "]");
            return res.status(500).json({ success: false, error: "Account creation failed. Please try again." });
          }
          throw err; // Non-username error — bubble to outer catch
        }
      }
    }

    req.login(user, (err) => {
      if (err) throw err;
      console.log("loggedin");
      res.json({ success: true, userId: user._id });
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
    const existingUser = await User.findOne({
      $or: [{ username }, { email: email.toLowerCase() }]
    });

    if (existingUser) {
      req.flash("error", "Username or email already exists. Please try a different one.");
      return res.redirect("/register-n");
    }

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
    console.error("Registration error:", err);

    req.flash("error", "Registration failed. Please try again.");
    res.redirect("/register-n");
  }
});


router.post("/login",
  passport.authenticate("local", {
    successRedirect: "/explore",
    failureRedirect: "/login-n",
    failureFlash: true
  })
);


router.get('/logout', (req, res, next) => {
  req.logout(err => {
    if (err) return next(err);
    req.flash("success", "Logged you out successfully!");
    res.redirect('/login-n');
  });
});

router.get("/forgot", (req, res) => {
  res.render("auth/forgot", { step: "email", title: "forgot password", showAds: false });
});


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

  const otp = crypto.randomInt(100000, 999999);
  user.resetOtp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Only send the minimal fields the mailer needs — avoid serializing the full Mongoose document
  const data = {
    user: { email: user.email, name: user.name, username: user.username },
    otp
  };
  addEmailJob(data, 5000)

  res.render("auth/forgot", {
    step: "otp",
    email,
    flash: { type: "success", message: "OTP sent to your email." },
    title: "forgot password"
  });
});


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


  user.password = password;
  user.resetOtp = undefined;
  user.otpExpiry = undefined;
  await user.save();

  req.flash("success", "Password changed successfully, now login!");
  res.redirect("/login-n");
});


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

  const otp = crypto.randomInt(100000, 999999);
  user.resetOtp = otp;
  user.otpExpiry = Date.now() + 10 * 60 * 1000;
  await user.save();

  // Only send the minimal fields the mailer needs — avoid serializing the full Mongoose document
  const data = {
    user: { email: user.email, name: user.name, username: user.username },
    otp
  };

  try {
    await addEmailJob(data, 5000);
  } catch (err) {
    console.error("Failed to enqueue OTP resend email:", err.message);
    return res.render("auth/forgot", {
      step: "otp",
      email,
      flash: { type: "error", message: "Failed to resend OTP. Please try again." },
      title: "forgot password"
    });
  }

  res.render("auth/forgot", {
    step: "otp",
    email,
    flash: { type: "success", message: "OTP resent successfully." },
    title: "forgot password"
  });
});

module.exports = router;
