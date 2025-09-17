// adminRoutes.js
const express = require("express");
const router = express.Router();
const Note = require("../models/note"); // adjust path
const User = require("../models/user");
const DownloadLog = require("../models/downloadLog"); // Import DownloadLog model
const {isLoggedIn, isModerator} = require("../middlewares");


// Admin Dashboard Data
router.get("/", isLoggedIn, isModerator, async (req, res) => {
  try {
    // 1. Total users
    const totalUsers = await User.countDocuments();

    // 2. Total notes
    const totalNotes = await Note.countDocuments();

    // 3. Total downloads (from notes)
    const totalDownloadsAgg = await Note.aggregate([
      { $group: { _id: null, total: { $sum: "$downloadCount" } } }
    ]);
    const totalDownloads = totalDownloadsAgg[0]?.total || 0;
    
    // New: Get total unique downloads from DownloadLog collection
    const totalUniqueDownloads = await DownloadLog.countDocuments();

    // 4. Top 5 most downloaded notes
    const topNotes = await Note.find()
      .sort({ downloadCount: -1 })
      .limit(5)
      .select("title downloadCount course semester");

    // 5. Semester-wise note count
    const semesterWise = await Note.aggregate([
      { $group: { _id: "$semester", notes: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    ]);

      // Unique sessions (kitne alag users ne kuch bhi download kiya)
      const uniqueSessions = (await DownloadLog.distinct("downloaderId")).length;

      // Unique IPs
      const uniqueIps = (await DownloadLog.distinct("ip")).length;


    // 6. Course-wise note count
    const courseWise = await Note.aggregate([
      { $group: { _id: "$course", notes: { $sum: 1 } } },
      { $sort: { notes: -1 } }
    ]);

    res.render("admin/adminDashboard", {
      totalUsers,
      totalNotes,
      totalDownloads,
      totalUniqueDownloads,
      uniqueSessions,
      uniqueIps,
      topNotes,
      semesterWise,
      courseWise
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;