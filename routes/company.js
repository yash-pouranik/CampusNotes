const express = require("express");
const router = express.Router();
const User = require("../models/user");


router.get("/bitbros/aboutus", (req, res) => {
  res.render("team/aboutus", {title: "About Us | Campus Notes"});
});

router.get("/feedback", (req, res) => {
  res.render("team/feedback", {title: "Feedback | CampusNotes", showAds: false});
})

router.get("/faq", (req, res) => {
  res.render("team/faq", { title: "FAQ | CampusNotes" });
});

router.get("/privacy-policy", (req, res) => {
  res.render("team/privacy-policy", { title: "Privacy Policy | CampusNotes" });
});

router.get("/terms-of-service", (req, res) => {
  res.render("team/terms-of-service", { title: "Terms of Service | CampusNotes" });
});


module.exports = router;
