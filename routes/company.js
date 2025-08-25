// routes/team.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/bitbros/our-team", async (req, res) => {
  try {
    const teamMembers = await User.find({
      $or: [
        { "roles.isModerator": true },
        { "roles.isDev": true }
      ]
    }).select("name username avatar roles socialLinks");

    res.render("team/our-team", {
      title: "Our Team | CampusNotes",
      teamMembers
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error loading team");
  }
});

router.get("/bitbros/aboutus", (req, res) => {
  res.render("team/aboutus", {title: "About Us | Campus Notes"});
});


module.exports = router;
