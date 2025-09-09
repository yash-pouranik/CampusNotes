const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Note = require("../models/note");
const Subject = require("../models/subject");
const { isLoggedIn, isModerator } = require("../middlewares");

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

module.exports = router;
