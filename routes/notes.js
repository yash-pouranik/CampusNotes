const express = require("express");
const router = express.Router();
const Note = require("../models/note");
const {isLoggedIn} = require("../middlewares");
const multer = require("multer");
const { storage } = require("../config/cloud");
const upload = multer({ storage });



router.get("/upload", isLoggedIn, async (req, res) => {

  if (!req.user.verified) {
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

  let filter = {};
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

  res.render('notes/explore', { notes, query: q, tag, allTags, title: "Explore | campusnotes" });
});




module.exports = router;