const express = require("express");
const router = express.Router();
const multer = require("multer");
const { storage } = require("../config/cloud");
const upload = multer({ storage });
const User = require("../models/user");
const { isModerator, isLoggedIn } = require("../middlewares");
const { json } = require("body-parser");
const { sendAccountVerificationMail } = require("../config/mailer")
const triviaQuestions = require("../config/trivia");





router.get("/verify", isLoggedIn, (req, res) => {
  if (!req.user.verification?.verified) {
    return res.render("verify/form", { title: "Verify Account", showAds: false });
  }
  req.flash("success", "You are already verified!");
  res.redirect("/explore");
});

router.post("/verify", isLoggedIn, upload.single("idProof"), async (req, res) => {
  if (req.user.verification?.verified) {
    req.flash("success", "You are already verified!");
    res.redirect("/explore");
  }
  const user = await User.findById(req.user._id);
  user.verification.docUrl = req.file.path;
  await user.save();
  res.redirect("/explore");
});

// --- Trivia Verification Routes ---

router.get("/verify/question", isLoggedIn, (req, res) => {
  // Check if user is already verified
  if (req.user.verification?.verified) {
    return res.status(400).json({ error: "You are already verified." });
  }

  // Get a random question
  const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

  // Store the question ID in the user's session to prevent cheating
  req.session.triviaQuestionId = randomQuestion.id;

  // Send only the question to the frontend, not the answer
  res.json({ question: randomQuestion.question, id: randomQuestion.id });
});

router.post("/verify/check-answer", isLoggedIn, async (req, res) => {
  const { answer, questionId } = req.body;
  const sessionQuestionId = req.session.triviaQuestionId;

  if (!sessionQuestionId || sessionQuestionId.toString() !== (questionId || "").toString()) {
    return res.status(400).render("verify/form", {
      title: "Verify Account",
      showAds: false,
      error_msg: "Session expired or invalid question. Please refresh."
    });
  }

  // Find the question from our config file
  const question = triviaQuestions.find(q => q.id.toString() === sessionQuestionId.toString());

  // Clean up and compare the answers
  const isCorrect = answer && question && (answer.trim().toLowerCase() === question.answer.toLowerCase());

  if (isCorrect) {
    // If answer is correct, update the user's profile
    await User.findByIdAndUpdate(req.user._id, {
      "verification.verified": true,
      "verification.verifiedAt": new Date()
    });
    // Clear the question ID from the session
    delete req.session.triviaQuestionId;

    req.flash("success", "Verification successful! You are now verified.");
    return res.redirect("/explore");
  } else {
    // If incorrect
    return res.render("verify/form", {
      title: "Verify Account",
      showAds: false,
      error_msg: "Incorrect answer. Please try again. OR if you are facing any issue mail to: campusnotes@bitbros.in"
    });
  }
});


router.get("/admin/verify-requests", isModerator, async (req, res) => {
  const unverifiedUsers = await User.find({
    "verification.verified": false,
    "verification.docUrl": { $exists: true, $ne: null }
  });
  res.render("admin/verify-list", {
    unverifiedUsers,
    title: "Verify? | CampusNotes"
  });
});

router.post("/admin/verify/:id", isModerator, async (req, res) => {
  const { action } = req.body;
  const userId = req.params.id;

  let update = {};

  if (action === "verify") {
    update = {
      "verification.verified": true,
      "verification.verifiedAt": new Date()
    };
  } else if (action === "reject") {
    update = {
      "verification.verified": false,
      "verification.rejectedAt": new Date(),
      "verification.docUrl": null
    };
  }

  const user = await User.findByIdAndUpdate(userId, update, { new: true });

  if (action === "verify") {
    sendAccountVerificationMail(user.email, "Verified");
    req.flash("success", "User verified successfully!");
  } else {
    sendAccountVerificationMail(user.email, "Rejected");

    req.flash("error", "User rejected!");
  }

  res.redirect("/admin/verify-requests");
});








module.exports = router;