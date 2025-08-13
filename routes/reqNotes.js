const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { isLoggedIn, isModerator } = require("../middlewares");
const RequestNote = require("../models/reqNotes");

// GET /requestnotes
// GET /requestnotes
router.get('/requestnotes', async (req, res) => {
  const requests = await RequestNote.find({})
    .populate('user', 'username name avatar') // Populate request owner
    .populate('comments.user', 'username name avatar') // ✅ Populate comment authors
    .sort({ createdAt: -1 });

  res.render('request/requestnotes', { 
    requests, 
    title: "Request Notes | CampusNotes",
    currUser: req.user // so delete/comment permissions work
  });
});




// POST /requestnotes (Create)
router.post('/requestnotes', isLoggedIn, async (req, res) => {
  const { content } = req.body;
  await RequestNote.create({ user: req.user._id, content });
  res.redirect('/requestnotes');
});



// POST /requestnotes/:id/delete (Delete)
router.post('/requestnotes/:id/delete', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const requestNote = await RequestNote.findById(id);

  if (!requestNote) {
    req.flash("error", "Request not found.");
    return res.redirect("/requestnotes");
  }

  // Check if user is the owner or a moderator
  if (requestNote.user.equals(req.user._id) || req.user.role === "moderator") {
    await RequestNote.findByIdAndDelete(id);
    req.flash("success", "Request deleted successfully.");
  } else {
    req.flash("error", "You don't have permission to delete this request.");
  }

  res.redirect("/requestnotes");
});


// POST /requestnotes/:id/comment
router.post('/requestnotes/:id/comment', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const { content } = req.body;

  if (!content || !content.trim()) {
    req.flash("error", "Comment cannot be empty.");
    return res.redirect('/requestnotes');
  }

  const requestNote = await RequestNote.findById(id);
  if (!requestNote) {
    req.flash("error", "Request note not found.");
    return res.redirect('/requestnotes');
  }

  requestNote.comments.push({
    user: req.user._id,
    content: content.trim()
  });

  await requestNote.save();
  res.redirect('/requestnotes');
});




module.exports = router;
