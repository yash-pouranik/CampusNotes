const express = require('express');
const router = express.Router();
const User = require("../models/user")
const Note = require("../models/note")
const {isLoggedIn, checkAccess} = require("../middlewares")
const multer = require("multer");
const { storage, cloudinary, deleteFromAllAccounts  } = require("../config/cloud");
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }
});


router.get("/profile/:id", async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      req.flash("error", "Something went wrong! try again later");
      return next();
    }

    const notes = await Note.find({ uploadedBy: user._id })
      .populate("subject", "name");

    user.uploaded = notes.length;

    res.render("user/profile", {
      user,
      notes,
      title: user.username || user.name || "Profile",
    });
  } catch (e) {
    console.error(e);
    req.flash("error", "Something went wrong! try again later");
    return next();
  }
});


router.get("/rankings", async (req, res) => {
  try {
    const topUsers = await User.aggregate([
      { $addFields: { uploaded: { $size: "$notes" } } },
      { $sort: { uploaded: -1 } },
      { $limit: 100 }
    ]);


    res.render("user/rankings", { topUsers, title: "Top Users | CampusNotes"});
  } catch (err) {
    console.error("Error fetching rankings:", err);
    req.flash("error", "Server Error")
    res.status(500).redirect("/explore");
  }
});


router.get("/profile/:id/edit", isLoggedIn, checkAccess, async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id && !req.user.roles.isModerator) {
      console.log("YOU R NOT AUTHORIZED");
      req.flash("error", "Not authorized to edit this profile");
      return res.redirect(`/profile/${req.params.id}`);
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      console.log("YOU R NOT AUTHORIZED");
      return res.send("User does not exist - 2");
    }

    console.log("YOU R NOT AUTHORIZED - 3", user);
    res.render("user/editProfile", {
      user,
      title: user.username || user.name || "EDIT",
    });
  } catch (e) {
    console.error(e);
    res.send("Some error occurred", e);
  }
});


router.put("/profile/:id/edit", isLoggedIn, checkAccess, async (req, res) => {
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

router.put("/profile/avatar", isLoggedIn, checkAccess, upload.single("avatar"), async (req, res) => {
  try {
    if (!req.file) {
      req.flash("error", "Please upload an image file");
      return res.redirect("/profile");
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("/profile");
    }

    const extractPublicId = (url) => {
      try {
        const idx = url.indexOf('/upload/');
        if (idx === -1) return null;
        const afterUpload = url.slice(idx + '/upload/'.length);
        const maybeWithVersion = afterUpload.split('/');
        if (maybeWithVersion[0].startsWith('v')) maybeWithVersion.shift();
        const pathWithExt = maybeWithVersion.join('/');
        return pathWithExt.replace(/\.[^.]+$/, '');
      } catch (e) {
        return null;
      }
    };

    if (user.avatar && user.avatar.includes('res.cloudinary.com') && !user.avatar.includes('dummy_profile')) {
      try {
        const oldPublicId = extractPublicId(user.avatar);
        if (oldPublicId) {
          await deleteFromAllAccounts(oldPublicId, { resource_type: "image" });
        }
      } catch (err) {
        console.warn("Cloudinary delete error:", err);
      }
    }

    let uploadResult;
    if (req.file.buffer) {
      const dataUri = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      uploadResult = await cloudinary.uploader.upload(dataUri, {
        folder: "avatars",
        resource_type: "image",
        use_filename: true,
        unique_filename: false,
        overwrite: true
      });
    } else {
      if (req.file.path) uploadResult = { secure_url: req.file.path, public_id: req.file.filename || null };
      else if (req.file.secure_url) uploadResult = { secure_url: req.file.secure_url, public_id: req.file.public_id || null };
    }

    if (!uploadResult || !uploadResult.secure_url) {
      console.error("Upload returned no secure_url:", uploadResult || req.file);
      req.flash("error", "Upload succeeded but no file URL returned");
      return res.redirect(`/profile/${req.user._id}`);
    }

    user.avatar = uploadResult.secure_url + (uploadResult.secure_url.includes('?') ? '&' : '?') + `t=${Date.now()}`;
    await user.save();

    if (typeof req.logIn === "function") {
      req.logIn(user, (err) => {
        if (err) console.warn("Session update failed:", err);
        req.flash("success", "Avatar updated successfully!");
        return res.redirect(`/profile/${req.user._id}`);
      });
    } else {
      req.user.avatar = user.avatar;
      req.flash("success", "Avatar updated successfully!");
      return res.redirect(`/profile/${req.user._id}`);
    }
  } catch (err) {
    console.error("Avatar update error:", err);
    req.flash("error", "Something went wrong while updating avatar");
    res.redirect(`/profile/${req.user._id}`);
  }
});


module.exports = router;