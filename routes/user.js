const express = require('express');
const router = express.Router();
const User = require("../models/user")
const Note = require("../models/note")

router.get("/profile/:id", async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('notes');
    if (!user) {
      return res.send("User does not exist");
    }

    res.render("user/profile", {
      user,
      title: user.username || user.name || "Profile",
    });
  } catch (e) {
    console.error(e);
    res.send("Some error occurred", e);
  }
});


router.get("/rankings", async (req, res) => {
  try {
    const topUsers = await User.find({})
      .sort({ uploaded: -1 }); // sort by most uploaded notes // Top 20
    res.render("user/rankings", { topUsers, title: "Top Users | CampusNotes"});
  } catch (err) {
    console.error("Error fetching rankings:", err);
    res.status(500).send("Server Error");
  }
});





module.exports = router;