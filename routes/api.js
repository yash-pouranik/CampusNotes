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
const aiService = require("../services/ai");
const Subscriber = require("../models/Subscriber");


router.get("/notes/list", isLoggedIn, async (req, res) => {
    try {
        const notes = await Note.find({}, "_id title").sort({ createdAt: -1 });
        res.json(notes);
    } catch (error) {
        console.error("Error fetching note list:", error);
        res.status(500).json({ error: "Could not fetch notes." });
    }
});


router.post("/notes/:id/ask", isLoggedIn, async (req, res) => {
    try {
        const note = await Note.findById(req.params.id);
        if (!note) {
            return res.status(404).json({ error: "Note not found." });
        }

        const userQuestion = req.body.question || "Summarize this document in 5 bullet points.";

        let contextText = "";

        if (note.fileUrl) {
            try {
                const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
                const pdfBuffer = response.data;
                const data = await pdf(pdfBuffer);
                contextText = data.text.trim().substring(0, 12000);
            } catch (err) {
                console.log("PDF Parse Error:", err.message);
            }
        }

        const messages = [{ role: 'user', content: userQuestion }];

        const aiResponseText = await aiService.generateResponse(messages, contextText);

        res.json({ answer: aiResponseText });

    } catch (error) {
        console.error("AI Route Error:", error);
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

        const response = await axios.get(note.fileUrl, {
            responseType: 'arraybuffer'
        });
        const pdfBuffer = response.data;

        const data = await pdf(pdfBuffer);
        const documentText = data.text.trim();

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


        return res.json(notes);

    } catch (e) {
        console.error("Error fetching notes:", e);
        return res.status(500).send("Something went wrong.");
    }
});


router.post("/subscribe", async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ error: "Email is required" });
        }

        const existing = await Subscriber.findOne({ email });
        if (existing) {
            return res.status(400).json({ error: "You are already subscribed." });
        }

        const newSubscriber = new Subscriber({ email });
        await newSubscriber.save();

        res.json({ success: true, message: "Successfully subscribed!" });
    } catch (error) {
        console.error("Subscription Error:", error);
        res.status(500).json({ error: "Failed to subscribe. Please try again." });
    }
});

module.exports = router;
