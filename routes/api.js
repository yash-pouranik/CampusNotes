const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Note = require("../models/note");
const User = require("../models/user");
const Subject = require("../models/subject");
const { isLoggedIn, isModerator } = require("../middlewares");
const triviaQuestions = require("../config/trivia");
const axios = require('axios');
const pdf = require('pdf-parse');


// Add the Gemini AI setup
const { GoogleGenerativeAI } = require("@google/generative-ai");
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });


// This is our new AI route
router.post("/notes/:id/ask", isLoggedIn, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: "Note not found." });
        }

        // Get the user's question from the request, default to "summarize"
        const userQuestion = req.body.question || "Summarize this document in 5 bullet points.";

        // 1. Download the PDF file from Cloudinary
        const response = await axios.get(note.fileUrl, {
            responseType: 'arraybuffer'
        });
        const pdfBuffer = response.data;

        // 2. Extract text from the PDF buffer
        const data = await pdf(pdfBuffer);
        const documentText = data.text;

        // 3. Create the prompt for the Gemini API
        const prompt = `Based on the following document, please answer the user's question. Document Content: "${documentText}". Question: "${userQuestion}"`;

        // 4. Call the Gemini API and get the response
        const result = await model.generateContent(prompt);
        const aiResponse = await result.response;
        const text = aiResponse.text();

        // 5. Send the AI's answer back to the frontend
        res.json({ answer: text });

    } catch (error) {
        console.error("AI Route Error:", error);
        console.log("Gemini API Key exists:", !!process.env.GEMINI_API_KEY);
        res.status(500).json({
            error: "Something went wrong while asking the AI.",
            details: error.message
        });
    }
});


router.get("/notes/:id/check-pdf", async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: "Note not found." });
        }

        // PDF download karein
        const response = await axios.get(note.fileUrl, {
            responseType: 'arraybuffer'
        });
        const pdfBuffer = response.data;

        // PDF se text nikalne ki koshish karein
        const data = await pdf(pdfBuffer);
        const documentText = data.text.trim();

        // Check karein ki text hai ya nahi (100 characters se zyada)
        if (documentText.length > 100) {
            res.json({ isTyped: true });
        } else {
            res.json({ isTyped: false });
        }

    } catch (error) {
        console.error("PDF Check Error:", error);
        res.status(500).json({ error: "Could not check PDF type." });
    }
});




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
        return res.status(400).json({ error: "Incorrect answer. Please try again. OR if you are facing any issue mail to: campusnotes@bitbros.in" });
    }
});

// Purana signature wala route waise hi rahega
router.get("/upload-signature", isLoggedIn, (req, res) => {
    // ... (existing signature code)
});


module.exports = router;
