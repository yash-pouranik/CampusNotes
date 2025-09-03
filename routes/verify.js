const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloud");
const upload = multer({ storage });
const User = require("../models/user");
const {isModerator, isLoggedIn} = require("../middlewares");
const { json } = require("body-parser");
const {sendAccountVerificationMail} = require("../config/mailer")





router.get("/verify", isLoggedIn, (req, res) => {
  if (!req.user.verification?.verified) {
    return res.render("verify/form", { title: "Verify Account" });
  }
  req.flash("success", "You are already verified!");
  res.redirect("/explore");
});

router.post("/verify", isLoggedIn, upload.single("idProof"), async (req, res) => {
  if (req.user.verification?.verified) {
    req.flash("success", "You are already verified!");
    res.redirect("/explore");
  }
  const user = await User.findById(req.user._id);
  user.verification.docUrl = req.file.path;
  await user.save();
  res.redirect("/explore");
});


router.get("/admin/verify-requests", isModerator, async (req, res) => {
  const unverifiedUsers = await User.find({
    "verification.verified": false,
    "verification.docUrl": { $exists: true, $ne: null }
  });
  res.render("admin/verify-list", { 
    unverifiedUsers, 
    title: "Verify? | CampusNotes" 
  });
});

router.post("/admin/verify/:id", isModerator, async (req, res) => {
  const { action } = req.body;
  const userId = req.params.id;

  let update = {};

  if (action === "verify") {
    update = {
      "verification.verified": true,
      "verification.verifiedAt": new Date()
    };
  } else if (action === "reject") {
    update = {
      "verification.verified": false,
      "verification.rejectedAt": new Date(),
      "verification.docUrl": null
    };
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true });

  if (action === "verify") {
    sendAccountVerificationMail(user.email, "Verified");
    req.flash("success", "User verified successfully!");
  } else {
    sendAccountVerificationMail(user.email, "Rejected");

    req.flash("error", "User rejected!");
  }

  res.redirect("/admin/verify-requests");
});








module.exports = router;