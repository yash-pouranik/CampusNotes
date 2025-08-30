const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloud");
const upload = multer({ storage });
const User = require("../models/user")
const {isModerator, isLoggedIn} = require("../middlewares")






router.get("/verify", isLoggedIn, (req, res) => {
  res.render("verify/form", { title: "Verify Account" });
});

router.post("/verify", isLoggedIn, upload.single("idProof"), async (req, res) => {
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
  await User.findByIdAndUpdate(req.params.id, { 
    "verification.verified": true, 
    "verification.verifiedAt": new Date()
  });
  req.flash("success", "User verified successfully!");
  res.redirect("/admin/verify-requests");
});







module.exports = router;