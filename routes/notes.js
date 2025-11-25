const express = require("express");
const mongoose = require("mongoose")
const router = express.Router();
const Note = require("../models/note");
const Subject = require("../models/subject")
const DownloadLog = require("../models/downloadLog");
const { isLoggedIn, isModerator } = require("../middlewares");
const { sendVerificationMail } = require("../config/mailer");
// const multer = require("multer");
const { cloudinary, getNextAccount } = require("../config/cloud");


// const upload = multer({ 
//   storage,
//   limits: { fileSize: 30 * 1024 * 1024 } // max 15MB
// });

// ===== to generate signature
router.get("/api/upload-signature", isLoggedIn, (req, res) => {
  const account = getNextAccount();

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: "campusNotes" },
    account.api_secret
  );

  res.json({
    signature,
    timestamp,
    cloudName: account.cloud_name,
    apiKey: account.api_key
  });
});






router.get("/upload", isLoggedIn, async (req, res) => {
  if (!req.user.verification?.verified && !req.user.roles?.isModerator) {
    req.flash("error", 'You are not verified! Verify <a href="/verify">here</a>');
    return res.redirect("/explore");
  }

  try {
    const subjects = await Subject.find().sort({ name: 1 }); // sorted A-Z
    const courses = [
      "B.Tech CSE",
      "B.Tech IT",
      "B.Tech ECE",
      "B.Tech ME",
      "MBA",
      "BBA",
      "MCA",
      "BCA"
    ];

    const semester = [
      "I",
      "II",
      "III",
      "IV",
      "V",
      "VI",
      "VII",
      "VIII",
      "IX",
      "X"
    ]

    res.render("notes/upload", {
      title: "Upload Notes",
      subjects,
      courses,
      semester,
      // Ye do lines add karein
      "process.env.CLOUD_NAME": process.env.CLOUD_NAME,
      "process.env.CLOUD_API_KEY": process.env.CLOUD_API_KEY
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load subjects");
    res.redirect("/explore");
  }
});






router.post("/upload", isLoggedIn, async (req, res) => {
  try {
    const { title, description, subject, course, visibility, newSubject, semester, fileUrl } = req.body;

    // fileUrl aana zaroori hai
    if (!fileUrl) {
      return res.status(400).json({ success: false, error: "File URL is missing." });
    }

    let subjectId;
    if (subject === "other" && newSubject) {
      let created = await Subject.findOneAndUpdate(
        { name: newSubject.trim() },
        { name: newSubject.trim() },
        { new: true, upsert: true }
      );
      subjectId = created._id;
    } else {
      subjectId = subject;
    }


    const copied = await Note.find({ title: title });



    if (copied.length < 1) {
      const note = new Note({
        title,
        description,
        subject: subjectId,
        course,
        semester,
        fileUrl: fileUrl, // Yahan Cloudinary se mila URL save hoga
        uploadedBy: req.user._id,
      });
      await note.save();

      res.json({ success: true, redirectUrl: "/explore" });
    } else {
      res.status(409).json({ success: false, error: `A note with this title already exists.${copied}` });
    }



  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong while saving the note." });
  }
});



// most voted notes
router.get("/most-voted", async (req, res) => {
  try {
    const notes = await Note.find()
      .populate("subject uploadedBy")
      .lean();

    // Filter out notes with 0 upvotes
    const votedNotes = notes
      .filter(note => note.upvotes && note.upvotes.length > 0)
      .sort((a, b) => b.upvotes.length - a.upvotes.length);

    res.render("notes/mostVoted", { notes: votedNotes, title: "Most Voted Notes | CampusNotes" });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong")
    res.redirect("/explore");
  }
});





router.get("/notes/:nid", async (req, res) => {
  try {
    const file = await Note.findById(req.params.nid)
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification");

    if (!file) {
      req.flash("error", "Note doesn't exist!");
      return res.redirect("/explore");
    }

    console.log(file.subject.name);
    const subId = file.subject._id;

    console.log(file.semester)
    const fileSemester = file.semester;

    const limit = 30

    const subjectNotes = await Note.find({ subject: subId })
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification")
      .sort({ createdAt: -1 }) // newest first

    const semNotes = await Note.find({ semester: fileSemester })
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification")
      .sort({ createdAt: -1 }) // newest first


    res.render("notes/eachNote", {
      note: file,
      subjectNotes,
      semNotes,
      title: `${file.title} | CampusNotes`,
      description: `${file.description}`
    });
  } catch (e) {
    console.error(e);
    req.flash("error", "Server Error")
    res.status(500).redirect("/explore");
  }
});

//download

router.get("/notes/:nid/download", async (req, res) => {
  try {
    const note = await Note.findById(req.params.nid);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    // Total download count hamesha badhayein
    note.downloadCount = (note.downloadCount || 0) + 1;
    await note.save();

    // Unique download tracking (cookie)
    let downloaderId = req.cookies.downloaderId;
    if (!downloaderId) {
      downloaderId = new mongoose.Types.ObjectId().toString();
      res.cookie("downloaderId", downloaderId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
    }

    // IP address
    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    // Check karein ki is user ne pehle download kiya ya nahi
    const existingLog = await DownloadLog.findOne({
      note: note._id,
      downloaderId: downloaderId,
    });

    if (!existingLog) {
      await DownloadLog.create({
        note: note._id,
        downloaderId,
        ip,
      });
    }

    return res.redirect(note.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong");
  }
});




// /explore
router.get("/explore", async (req, res) => {
  try {
    const { q, course, semester, visibility } = req.query;

    let filter = { isVerified: true };

    // 🔍 Search by query
    if (q) {
      filter.$text = { $search: q };
    }

    // 🎓 Filter by course (dropdown filter in frontend)
    if (course && course !== "all") {
      filter.course = course;
    }

    // 📚 Filter by semester
    if (semester && semester !== "all") {
      filter.semester = semester;
    }

    // 🌍 Filter by visibility
    if (visibility && visibility !== "all") {
      filter.visibility = visibility;
    }

    // 📄 Pagination (for better performance)
    const page = parseInt(req.query.page) || 1;
    const limit = 12;
    const skip = (page - 1) * limit;

    const notes = await Note.find(filter, q ? { score: { $meta: "textScore" } } : {})
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification")
      .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 }) // sort by relevance if searching, else newest
      .skip(skip)
      .limit(limit);

    const totalNotes = await Note.countDocuments(filter);
    const totalPages = Math.ceil(totalNotes / limit);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        notes,
        currentPage: page,
        totalPages
      });
    }



    res.render("notes/explore", {
      notes,
      query: q,
      course,
      semester,
      visibility,
      currentPage: page,
      totalPages,
      title: "Explore Notes at SVVV | CampusNotes",
      description: "Browse and download free notes for B.Tech CSE, BBA, and other courses at Shri Vaishnav Vidyapeeth Vishwavidyalaya (SVVV). Search and filter by subject, course, and semester.",
    });
  } catch (err) {
    console.error("❌ Explore Error:", err);
    res.status(500).send("Server error while fetching notes.");
  }
});



router.get("/notes/:nid/edit", isLoggedIn, async (req, res) => {
  try {
    const file = await Note.findById(req.params.nid)
      .populate("uploadedBy")
      .populate("subject"); // so note.subject.name works

    const noteId = req.params.nid;

    if (!file) {
      req.flash("error", "Note doesn't exist!");
      return res.redirect("/explore");
    }

    const isOwner = file.uploadedBy._id.toString() === req.user._id.toString();
    const isModerator = req.user.roles?.isModerator;
    const isDev = req.user.roles?.isDev;

    if (!isOwner && !isModerator && !isDev) {
      req.flash("error", "You are not authorized to do this");
      return res.redirect(`/notes/${noteId}`);
    }

    // ✅ Fetch subjects & courses for form dropdowns
    const subjects = await Subject.find().sort({ name: 1 });
    const courses = [
      "B.Tech CSE",
      "B.Tech IT",
      "B.Tech ECE",
      "B.Tech ME",
      "MBA",
      "BBA",
      "MCA",
      "BCA"
    ];

    res.render("notes/editNote", {
      note: file,
      subjects,
      courses,
      title: `${file.title} | campusnotes`
    });
  } catch (e) {
    console.error(e);
    req.flash("error", "Some error at our end.");
    return res.status(500).redirect("/explore");
  }
});





router.put('/notes/:id', isLoggedIn, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id).populate("uploadedBy");

    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect("/explore");
    }

    // ✅ Authorization: Only owner or moderator/dev can edit
    const isOwner = note.uploadedBy._id.toString() === req.user._id.toString();
    const isModerator = req.user.roles?.isModerator;
    const isDev = req.user.roles?.isDev;

    if (!isOwner && !isModerator && !isDev) {
      req.flash("error", "You are not authorized to edit this note");
      return res.redirect(`/notes/${req.params.id}`);
    }

    // ✅ Validate subject ID
    if (!mongoose.Types.ObjectId.isValid(req.body.subject)) {
      req.flash("error", "Invalid subject selected");
      return res.redirect(`/notes/${req.params.id}/edit`);
    }

    // ✅ Update fields
    await Note.findByIdAndUpdate(req.params.id, {
      title: req.body.title,
      description: req.body.description,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      subject: req.body.subject,
      course: req.body.course,
      fileUrl: note.fileUrl // keep old file
    });

    req.flash("success", "Note updated successfully");
    res.redirect(`/notes/${req.params.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Error updating note");
    res.redirect(`/notes/${req.params.id}/edit`);
  }
});


router.delete("/notes/:id", isLoggedIn, async (req, res) => {
  try {
    const note = await Note.findById(req.params.id);

    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect("/explore");
    }

    // ✅ permission check
    if (
      note.uploadedBy.toString() !== req.user._id.toString() &&
      !req.user.roles?.isModerator
    ) {
      req.flash("error", "You are not authorized to delete this note");
      return res.redirect(`/notes/${note._id}`);
    }

    // ✅ Corrected Cloudinary delete logic
    if (note.fileUrl) {
      try {
        const urlParts = note.fileUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex > -1 && urlParts.length > uploadIndex + 2) {
          const resourceType = urlParts[uploadIndex - 1]; // This will be 'image', 'raw', etc.
          const publicIdWithFolder = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];

          if (resourceType && publicIdWithFolder) {
            await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: resourceType });
          }
        }
      } catch (cloudErr) {
        console.warn("Cloudinary delete error:", cloudErr.message);
        // It's a good practice to log the error but not block the note deletion from the DB.
      }
    }

    // ✅ user.notes array se bhi remove karo
    await mongoose.model("User").updateOne(
      { _id: note.uploadedBy },
      { $pull: { notes: note._id } }
    );

    // ✅ finally note delete
    await note.deleteOne();

    req.flash("success", "Note deleted successfully!");
    res.redirect("/explore");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while deleting");
    res.redirect("/explore");
  }
});







router.get('/admin/verify-notes', isModerator, async (req, res) => {
  try {
    const unverifiedNotes = await Note.find({ isVerified: false })
      .populate('uploadedBy', 'username email roles')
      .populate("subject", "name");

    res.render('admin/verifyNotes', {
      title: "Verify Notes | Admin",
      unverifiedNotes
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load unverified notes");
    res.redirect("/explore");
  }
});




// POST - Accept or reject a note
router.post('/admin/verify-notes', isModerator, async (req, res) => {
  const { noteId, action } = req.body;

  if (!noteId || !action) {
    req.flash("error", "Missing note ID or action");
    return res.redirect('/admin/verify-notes');
  }

  try {
    const note = await Note.findById(noteId).populate('uploadedBy');
    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect('/admin/verify-notes');
    }

    if (action === 'accept') {
      if (note.uploadedBy) {
        // Add note id if not already in user's notes
        const alreadyExists = note.uploadedBy.notes.some(
          nId => nId.toString() === note._id.toString()
        );
        if (!alreadyExists) {
          note.uploadedBy.notes.push(note._id);
          await note.uploadedBy.save();
        }
      }
      note.isVerified = true;
      await note.save();
      sendVerificationMail(note.uploadedBy.email, "Accepted")
      req.flash("success", "Note verified successfully");
    }

    else if (action === 'reject') {
      try {
        const urlParts = note.fileUrl.split('/');
        const publicIdWithFolder = urlParts.slice(urlParts.indexOf('upload') + 1).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: "raw" });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
      }
      await Note.findByIdAndDelete(noteId);
      sendVerificationMail(note.uploadedBy.email, "Rejected")
      req.flash("success", "Note rejected and deleted");
    }

    res.redirect('/admin/verify-notes');
  } catch (err) {
    console.error("Admin note processing error:", err);
    req.flash("error", "Error processing note");
    res.redirect('/admin/verify-notes');
  }
});



router.post("/notes/:nid/upvote", isLoggedIn, async (req, res) => {
  try {
    const note = await Note.findById(req.params.nid);
    if (!note) return res.status(404).send("Note not found");

    const userId = req.user._id;

    if (note.upvotes.includes(userId)) {
      // Already voted → remove vote
      note.upvotes.pull(userId);
    } else {
      note.upvotes.push(userId);
    }

    await note.save();
    res.redirect(`/notes/${req.params.nid}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});









module.exports = router;
