const express = require('express');
const router = express.Router();
const User = require("../models/user")
const Note = require("../models/note")
const {isLoggedIn} = require("../middlewares")

router.get("/profile/:id",  async (req, res) => {
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


router.get("/profile/:id/edit", isLoggedIn,  async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('notes');
    if (!user) {
      return res.send("User does not exist");
    }

    res.render("user/editProfile", {
      user,
      title: user.username || user.name || "EDIT",
    });
  } catch (e) {
    console.error(e);
    res.send("Some error occurred", e);
  }
});


router.put("/profile/:id/edit", isLoggedIn,  async (req, res) => {
  try{
    const {username, name, email, course} = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, {
      username,
      name,
      email,
      course,
    });

    req.flash("success", "Updated");
    res.redirect(`/profile/${req.params.id}`)
  }catch(e) {
    req.flash("error", "Something went wrong at our end!");
    res.redirect(`/profile/${req.params.id}`);
  }
})




module.exports = router;