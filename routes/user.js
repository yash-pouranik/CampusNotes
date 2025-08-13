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
    const topUsers = await User.aggregate([
      { $addFields: { uploaded: { $size: "$notes" } } },
      { $sort: { uploaded: -1 } },
      { $limit: 20 }
    ]);


    res.render("user/rankings", { topUsers, title: "Top Users | CampusNotes"});
  } catch (err) {
    console.error("Error fetching rankings:", err);
    req.flash("error", "Server Error")
    res.status(500).redirect("/explore");
  }
});


router.get("/profile/:id/edit", isLoggedIn,  async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && !req.user.roles.isModerator) {
      req.flash("error", "Not authorized to edit this profile");
      return res.redirect(`/profile/${req.params.id}`);
    }

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


router.put("/profile/:id/edit", isLoggedIn, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && !req.user.roles.isModerator) {
      req.flash("error", "Not authorized to edit this profile");
      return res.redirect(`/profile/${req.params.id}`);
    }

    const { username, name, course } = req.body;
    const socialLinks = req.body.socialLinks || {};

    const existingUser = await User.findById(req.params.id);

    await User.findByIdAndUpdate(req.params.id, {
      username,
      name,
      course,
      socialLinks: {
        linkedin: socialLinks.linkedin || existingUser.socialLinks.linkedin,
        github: socialLinks.github || existingUser.socialLinks.github
      }
    });

    req.flash("success", "Profile updated successfully");
    res.redirect(`/profile/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong");
    res.redirect(`/profile/${req.params.id}`);
  }
});




module.exports = router;