// adminRoutes.js
const express = require("express");
const router = express.Router();
const Note = require("../models/note");
const User = require("../models/user");
const DownloadLog = require("../models/downloadLog");
const RequestNote = require("../models/reqNotes");
const { isLoggedIn, isModerator } = require("../middlewares");

// Admin Dashboard Data
router.get("/", isLoggedIn, isModerator, async (req, res) => {
  
  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);


    const [totalUsers, totalNotes, totalDownloadsAgg, fiveLastUsers, topNotes] = await Promise.all([
      User.countDocuments(),
      Note.countDocuments(),
      Note.aggregate([{ $group: { _id: null, total: { $sum: "$downloadCount" } } }]),
      User.find().sort({ createdAt: -1 }).limit(5).lean(), // Added .lean()
      Note.find({}).sort({ downloadCount: -1 }).limit(12).select("title course downloadCount").lean()
    ]);


    const totalDownloads = totalDownloadsAgg[0]?.total || 0;
    const downloadsLast7Days = await DownloadLog.countDocuments({ downloadedAt: { $gte: sevenDaysAgo } });

    // === Unique Traffic Stats ===
    const totalUniqueDownloads = await DownloadLog.countDocuments();
    const uniqueSessions = (await DownloadLog.distinct("downloaderId")).length;
    const uniqueIps = (await DownloadLog.distinct("ip")).length;



    const LastDownloads = await DownloadLog.find()
    .populate("note")
    .sort({ downloadedAt: -1 })
    .limit(10);

    // === User Engagement ===
    const newSignups = await User.countDocuments({ createdAt: { $gte: sevenDaysAgo } });
    const verifiedUsers = await User.countDocuments({ "verification.verified": true });
    const unverifiedUsers = totalUsers - verifiedUsers;
    const topContributors = await User.aggregate([
        { $project: { name: 1, username: 1, avatar: 1, notesCount: { $size: "$notes" } } },
        { $sort: { notesCount: -1 } },
        { $limit: 3 }
    ]);

    // === Content & Moderation ===
    const notesPendingVerification = await Note.countDocuments({ isVerified: false });
    const newNoteUploads = await Note.countDocuments({ createdAt: { $gte: sevenDaysAgo } });

    const courseWise = await Note.aggregate([
        { $group: { _id: "$course", notes: { $sum: 1 } } },
        { $sort: { notes: -1 } },
    ]);

    res.render("admin/adminDashboard", {
      // Core Stats
      totalUsers,
      totalNotes,
      totalDownloads,
      downloadsLast7Days,
      // Unique Traffic
      totalUniqueDownloads,
      uniqueSessions,
      uniqueIps,
      // User Engagement
      newSignups,
      verifiedUsers,
      unverifiedUsers,
      topContributors,
      // Content & Moderation
      notesPendingVerification,
      newNoteUploads,
      topNotes,
      courseWise,
      fiveLastUsers,
      LastDownloads,
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
});

module.exports = router;