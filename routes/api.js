const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Note = require("../models/note");
const User = require("../models/user");
const Subject = require("../models/subject");
const { isLoggedIn, isModerator } = require("../middlewares");
const triviaQuestions = require("../config/trivia"); 


router.get("/notes/:sec", async (req, res) => {
    try {
        const sec = req.params.sec;

        if (!sec) {
            return res.status(400).send("User API key required.");
        }

        if (sec !== process.env.API_SEC) {
            return res.status(403).send("You are not authorized.");
        }

        const notes = await Note.find()
            .populate("uploadedBy", "username socialLinks");

        // If you only want titles:
        // const noteTitles = notes.map(note => note.title);
        // return res.json(noteTitles);

        // Otherwise return full notes:
        return res.json(notes);

    } catch (e) {
        console.error("Error fetching notes:", e);
        return res.status(500).send("Something went wrong.");
    }
});




router.get("/trivia-question", isLoggedIn, (req, res) => {
  // Check if user is already verified
  if (req.user.verification.verified) {
    return res.status(400).json({ error: "You are already verified." });
  }

  // Get a random question
  const randomQuestion = triviaQuestions[Math.floor(Math.random() * triviaQuestions.length)];

  // Store the question ID in the user's session to prevent cheating
  req.session.triviaQuestionId = randomQuestion.id;

  // Send only the question to the frontend, not the answer
  res.json({ question: randomQuestion.question });
});

// 2. NAYA ROUTE: Answer Verify Karne Ke Liye
router.post("/verify-trivia", isLoggedIn, async (req, res) => {
  const { answer } = req.body;
  const questionId = req.session.triviaQuestionId;

  if (!questionId) {
    return res.status(400).json({ error: "No question was provided. Please refresh." });
  }

  // Find the question from our config file
  const question = triviaQuestions.find(q => q.id === questionId);
  
  // Clean up and compare the answers
  const isCorrect = answer && question && (answer.trim().toLowerCase() === question.answer);

  if (isCorrect) {
    // If answer is correct, update the user's profile
    await User.findByIdAndUpdate(req.user._id, {
      "verification.verified": true,
      "verification.verifiedAt": new Date()
    });
    // Clear the question ID from the session
    delete req.session.triviaQuestionId;
    return res.json({ success: true, message: "Verification successful!" });
  } else {
    // If incorrect, send an error message
    return res.status(400).json({ error: "Incorrect answer. Please try again." });
  }
});

// Purana signature wala route waise hi rahega
router.get("/upload-signature", isLoggedIn, (req, res) => {
    // ... (existing signature code)
});


module.exports = router;
