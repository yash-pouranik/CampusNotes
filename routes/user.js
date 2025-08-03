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



module.exports = router;