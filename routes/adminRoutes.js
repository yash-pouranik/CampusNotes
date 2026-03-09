// adminRoutes.js
const express = require("express");
const router = express.Router();
const Note = require("../models/note");
const User = require("../models/user");
const DownloadLog = require("../models/downloadLog");
const RequestNote = require("../models/reqNotes");
const { isLoggedIn, isModerator } = require("../middlewares");

// GET FOR - Dashboard Stats
router.get("/", isLoggedIn, isModerator, async (req, res) => {

  try {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    console.log("Admin Dashboard Route Hit - Fetching Data...");


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

    // === Daily Downloads (Last 7 Days) for Line Chart ===
    const dailyDownloads = await DownloadLog.aggregate([
      { $match: { downloadedAt: { $gte: sevenDaysAgo } } },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$downloadedAt" } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill in missing days with 0
    const last7DaysData = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0];
      const record = dailyDownloads.find(r => r._id === dateStr);
      last7DaysData.push({ date: dateStr, count: record ? record.count : 0 });
    }

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
      last7DaysData // Passed for Line Chart
    });
  } catch (err) {
    console.error("Admin Dashboard Error:", err);
    res.status(500).send("Server Error");
  }
});

// GET FOR - User Management Page
router.get("/users", isLoggedIn, isModerator, async (req, res) => {
  try {
    const { q } = req.query;
    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    let filter = {};
    if (q) {
      filter = {
        $or: [
          { username: { $regex: q, $options: 'i' } },
          { name: { $regex: q, $options: 'i' } },
          { email: { $regex: q, $options: 'i' } }
        ]
      };
    }

    const [users, totalUsers] = await Promise.all([
      User.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      User.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalUsers / limit);

    res.render("admin/manageUsers", {
      title: "Manage Users | CampusNotes",
      users,
      currentPage: page,
      totalPages,
      query: q || ""
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Error loading users");
    res.redirect("/dashboard");
  }
});

// POST FOR - Toggle Block User
router.post("/users/:id/toggle-block", isLoggedIn, isModerator, async (req, res) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    
    if (!user) {
      req.flash("error", "User not found");
      return res.redirect("back");
    }

    // Don't block self
    if (user._id.toString() === req.user._id.toString()) {
      req.flash("error", "You cannot block yourself.");
      return res.redirect("back");
    }

    user.isBlocked = !user.isBlocked;
    await user.save();

    req.flash("success", `User ${user.isBlocked ? 'blocked' : 'unblocked'} successfully.`);
    res.redirect("back");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong.");
    res.redirect("back");
  }
});

module.exports = router;