const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloud");
const upload = multer({ storage });
const User = require("../models/user")






router.get("/verify", (req, res) => {
  res.render("verify/form", { title: "Verify Account" });
});

router.post("/verify", upload.single("idProof"), async (req, res) => {
  const user = await User.findById(req.user._id);
  user.verificationDoc = req.file.path;
  await user.save();
  res.redirect("/explore");
});

module.exports = router;