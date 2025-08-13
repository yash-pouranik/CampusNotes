// routes/team.js
const express = require("express");
const router = express.Router();
const User = require("../models/user");

router.get("/our-team", async (req, res) => {
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

module.exports = router;
