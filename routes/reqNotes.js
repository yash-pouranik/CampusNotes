const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const { isLoggedIn } = require("../middlewares");
const RequestNote = require("../models/reqNotes");
const {addBgJob} = require("../queues/bg.queue")
const { sendNewRequestMail } = require("../config/mailer");



// GET /requestnotes
router.get('/requestnotes', async (req, res) => {
  const requests = await RequestNote.find({})
    .populate('user', 'username name avatar') 
    .populate('comments.user', 'username name avatar') 
    .sort({ createdAt: -1 });

    for(r of requests) {
      console.log(r)
    }

  res.render('request/requestnotes', { 
    requests, 
    title: "Request Notes | CampusNotes",
    currUser: req.user 
  });
});


// POST /requestnotes (Create new request)
// POST /requestnotes (Create new request)
router.post('/requestnotes', isLoggedIn, async (req, res) => {
  try {
    const { content } = req.body;

    if (!content || !content.trim()) {
      req.flash("error", "Request cannot be empty.");
      return res.redirect("/requestnotes");
    }
    if (content.length > 280) {
      req.flash("error", "Request too long! Max 280 characters allowed.");
      return res.redirect("/requestnotes");
    }

    const newRequest = await RequestNote.create({ 
      user: req.user, 
      content: content.trim() 
    });

    // ✅ populate user data for email
    await newRequest.populate("user", "username name email");

    // send email to all users
    console.log(newRequest.user)
    const requestData = {
      _id: newRequest.user._id,
      user: newRequest.user,
      content: newRequest.content,
      postedBy: newRequest.user.username || newRequest.user.name,
    };

    addBgJob({requestData});
    
    req.flash("success", "Request posted successfully!");
    res.redirect("/requestnotes");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong.");
    res.redirect("/requestnotes");
  }
});



// POST /requestnotes/:id/delete
router.post('/requestnotes/:id/delete', isLoggedIn, async (req, res) => {
  const { id } = req.params;
  const requestNote = await RequestNote.findById(id);

  if (!requestNote) {
    req.flash("error", "Request not found.");
    return res.redirect("/requestnotes");
  }

  // Permission check
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
  try {
    const { id } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      req.flash("error", "Comment cannot be empty.");
      return res.redirect("/requestnotes");
    }
    if (content.length > 200) {
      req.flash("error", "Comment too long! Max 200 characters allowed.");
      return res.redirect("/requestnotes");
    }

    const requestNote = await RequestNote.findById(id);
    if (!requestNote) {
      req.flash("error", "Request note not found.");
      return res.redirect("/requestnotes");
    }

    requestNote.comments.push({
      user: req.user._id,
      content: content.trim()
    });

    await requestNote.save();
    req.flash("success", "Comment added!");
    res.redirect('/requestnotes');
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong.");
    res.redirect("/requestnotes");
  }
});

module.exports = router;
