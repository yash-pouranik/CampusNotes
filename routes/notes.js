const express = require("express");
const mongoose = require("mongoose")
const router = express.Router();
const Note = require("../models/note");
const Subject = require("../models/subject");
const {isLoggedIn, isModerator} = require("../middlewares");
const multer = require("multer");
const { storage, cloudinary  } = require("../config/cloud");
const upload = multer({ storage });


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

    res.render("notes/upload", {
      title: "Upload Notes",
      subjects,
      courses
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load subjects");
    res.redirect("/explore");
  }
});






router.post("/upload", isLoggedIn, upload.single("file"), async (req, res) => {
  if (!req.user.verification?.verified && !req.user.roles.isModerator) {
    req.flash("error", "You are not Verified");
    return res.redirect("/explore");
  }

  try {
    const { title, description, subject, course, visibility, newSubject } = req.body;
    const tags = req.body.tags ? req.body.tags.split(",").map(t => t.trim()) : [];

    let subjectId = subject;

    // If user selected "other", create new subject
    if (subject === "other" && newSubject?.trim()) {
      const createdSub = await Subject.create({
        name: newSubject.trim()
      });
      subjectId = createdSub._id;
    }

    if (!mongoose.Types.ObjectId.isValid(subjectId)) {
      req.flash("error", "Invalid subject selected");
      return res.redirect("/notes/upload");
    }

    if (!req.file) {
      req.flash("error", "Please upload a file");
      return res.redirect("/notes/upload");
    }

    const newNote = new Note({
      title,
      description,
      subject: subjectId,
      course,
      tags,
      visibility,
      fileUrl: req.file.path,
      uploadedBy: req.user._id
    });

    await newNote.save();

    req.user.notes.push(newNote._id);
    await req.user.save();

    res.redirect(`/profile/${req.user._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while uploading the note");
    res.redirect("/notes/upload");
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

    res.render("notes/eachNote", { note: file, title: `${file.title} | campusnotes` });
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

    // Increment downloads
        console.log(note)
    note.downloadCount = (note.downloadCount || 0) + 1;
    console.log(note)
    await note.save();


    // Redirect to actual file URL
    return res.redirect(note.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong");
  }
});




//explore
router.get('/explore', async (req, res) => {
  const { q } = req.query;

  let filter = {};

  // Search by title or subject name
  if (q) {
    // First find matching subjects
    const subjectMatches = await Subject.find({ name: new RegExp(q, 'i') }).select('_id');
    const subjectIds = subjectMatches.map(s => s._id);

    filter.$or = [
      { title: new RegExp(q, 'i') },
      { subject: { $in: subjectIds } }
    ];
  }

  const notes = await Note.find(filter)
    .populate('subject', 'name')
    .populate('uploadedBy', 'username name roles verification');

  res.render('notes/explore', {
    notes,
    query: q,
    title: "Explore | campusnotes"
  });
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







router.get('/admin/verify-notes', isModerator, async (req, res) => {
  try {
    const unverifiedNotes = await Note.find({ isVerified: false })
      .populate('uploadedBy', 'username email roles');

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