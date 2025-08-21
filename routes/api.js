const express = require("express");
const mongoose = require("mongoose")
const router = express.Router();
const Note = require("../models/note");
const Subject = require("../models/subject")
const {isLoggedIn, isModerator} = require("../middlewares");





router.get("/notes/:sec", async (req, res) => {
    try{
        const sec = req.params.sec;
        if(sec !== process.env.API_SEC){
            return res.send("you are not authorized");
        }
        if(!sec) {
            return res.send("User api required.");
        }

        const notes = await Note.find()
        .populate("uploadedBy", "username socialLinks");

        res.send(notes);


    } catch(e) {
        res.send("Something went wrong");
    }
})


module.exports = router;