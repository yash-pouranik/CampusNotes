const express = require("express");
const router = express.Router();
const Note = require("../models/note");
const {isLoggedIn, isModerator} = require("../middlewares");
const multer = require("multer");
const { storage, cloudinary  } = require("../config/cloud");
const upload = multer({ storage });



router.get("/upload", isLoggedIn, async (req, res) => {

  if (!req.user.verified && !req.user.moderator_YASH_09) {
    req.flash("error", 'You are not verified! Verify <a href="/verify">here</a>');
    return res.redirect("/explore");
  }


  res.render("notes/upload", {title: "Upload Notes"});
})





router.post("/upload", isLoggedIn, upload.single("file"), async (req, res) => {

  if (!req.user.verified) {
    req.flash("error", "You are not Verified")
    return res.redirect("/explore");
  }



  const { title, description, subject, course } = req.body;
  const tags = req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [];

  const newNote = new Note({
    title,
    description,
    subject,
    course,
    tags,
    fileUrl: req.file.path, // Cloudinary file URL
    uploadedBy: req.user._id
  });

  await newNote.save();

  // Optional: add note ID to user's notes array
  req.user.notes.push(newNote._id);
  req.user.uploaded++;
  await req.user.save();

  res.redirect(`/profile/${req.user._id}`);
});



router.get("/notes/:nid", async (req, res) => {
  try {
    const file = await Note.findById(req.params.nid).populate("uploadedBy");
    if (!file) {
      return res.status(404).send("Note not found");
    }

    res.render("notes/eachNote", { note: file, title: `${file.title} | campusnotes` });
  } catch (e) {
    console.error(e);
    res.status(500).send("Server error");
  }
});

//download
router.get("/notes/:nid/download", async (req, res) => {
  try {
    const note = await Note.findById(req.params.nid);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    // Increment download count
    note.downloadCount += 1;
    await note.save();

    // Redirect to the actual file URL (hosted on cloud or local)
    return res.redirect(note.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong");
  }
});


//explore
router.get('/explore', async (req, res) => {
  const { q, tag } = req.query;

  let filter = {
    isVerified: true  // ✅ Only show verified notes
  };

  if (q) {
    filter.$or = [
      { title: new RegExp(q, 'i') },
      { subject: new RegExp(q, 'i') },
    ];
  }

  if (tag) {
    filter.tags = tag;
  }

  const notes = await Note.find(filter).populate('uploadedBy');
  const allTags = await Note.distinct("tags");

  res.render('notes/explore', {
    notes,
    query: q,
    tag,
    allTags,
    title: "Explore | campusnotes"
  });
});


// GET - Show unverified notes
router.get('/admin/verify-notes', isModerator, async (req, res) => {
  try {
    const unverifiedNotes = await Note.find({ isVerified: false }).populate('uploadedBy');
    res.render('admin/verifyNotes', {
      title: "Verify Notes | Admin",
      unverifiedNotes
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
});



// POST - Accept or reject a note
router.post('/admin/verify-notes', async (req, res) => {
  const { noteId, action } = req.body;

  if (!noteId || !action) {
    return res.status(400).send("Missing note ID or action");
  }

  try {
    const note = await Note.findById(noteId)
    .populate('uploadedBy');

    if (!note) return res.status(404).send("Note not found");

    if (action === 'accept') {
      //updating user
      note.uploadedBy.uploaded += 1;
      await note.uploadedBy.save(); 

      note.isVerified = true;

      await note.save();
    } else if (action === 'reject') {
      // 🔍 Extract public_id from fileUrl
      const fileUrl = note.fileUrl;

      // Assuming URL format like:
      // https://res.cloudinary.com/<cloud-name>/raw/upload/v1234567890/campusNotes/filename-12345.pdf
      const publicIdWithFolder = fileUrl
        .split('/upload/')[1] // gives: v1234567890/campusNotes/filename-12345.pdf
        .split('.')[0];       // removes .pdf (or .docx etc.)

      // 🗑 Delete from cloudinary
      await cloudinary.uploader.destroy(publicIdWithFolder, {
        resource_type: "raw"
      });

      // 🧼 Delete note from DB
      await Note.findByIdAndDelete(noteId);
    }

    res.redirect('/admin/verify-notes');
  } catch (err) {
    req.flash("error", "Cloudinary or DB error");
    res.status(500).send("Error processing note");
  }
});






module.exports = router;