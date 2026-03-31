const express = require("express");
const router = express.Router();
const mongoose = require("mongoose");
const Chat = require("../models/chat");
const Note = require("../models/note");
const { isLoggedIn, checkAccess } = require("../middlewares");
const axios = require('axios');
const pdf = require('pdf-parse');
const aiService = require("../services/ai");

const MAX_CHATS = 10;

router.get("/chat", isLoggedIn, async (req, res) => {
    try {
        const chatHistory = await Chat.find({ user: req.user._id })
            .select("title lastActivity noteTitle")
            .sort({ lastActivity: -1 });

        let currentChat = null;
        if (req.query.id) {
            currentChat = await Chat.findOne({ _id: req.query.id, user: req.user._id });
        }

        res.render("chat/index", {
            title: "AI Study Companion",
            chatHistory,
            currentChat,
            userChatsCount: chatHistory.length,
            maxChats: MAX_CHATS
        });
    } catch (error) {
        console.error("Chat Page Error:", error);
        req.flash("error", "Could not load chat interface.");
        res.redirect("/");
    }
});

router.post("/api/chat/new", isLoggedIn, checkAccess, async (req, res) => {
    try {
        const count = await Chat.countDocuments({ user: req.user._id });
        if (count >= MAX_CHATS) {
            return res.status(403).json({ error: "Limit reached. You can only have 10 active chats. Please delete old ones." });
        }

        const { noteId, messages } = req.body;
        let noteTitle = "General Chat";
        let noteRef = null;

        if (noteId) {
            const note = await Note.findById(noteId);
            if (note) {
                noteTitle = note.title;
                noteRef = note._id;
            }
        }

        let initialMessages = [{ role: 'system', content: `Chat started for context: ${noteTitle}` }];
        if (messages && Array.isArray(messages) && messages.length > 0) {
            const validMessages = messages.map(m => ({
                role: (m.role === 'user' || m.role === 'ai') ? m.role : 'user',
                content: m.content || '',
                timestamp: new Date()
            }));
            initialMessages = [...initialMessages, ...validMessages];
        }

        const newChat = new Chat({
            user: req.user._id,
            title: noteTitle,
            noteId: noteRef,
            noteTitle: noteTitle,
            messages: initialMessages
        });

        await newChat.save();
        res.json({ success: true, chatId: newChat._id });

    } catch (error) {
        console.error("Create Chat Error:", error);
        res.status(500).json({ error: "Failed to create chat." });
    }
});

router.post("/api/chat/:id/message", isLoggedIn, checkAccess, async (req, res) => {
    try {
        const chatId = req.params.id;
        const { message } = req.body;
        const chat = await Chat.findOne({ _id: chatId, user: req.user._id });

        if (!chat) return res.status(404).json({ error: "Chat not found." });

        chat.messages.push({ role: 'user', content: message });
        chat.lastActivity = Date.now();
        await chat.save();

        let contextText = "";

        if (chat.noteId) {
            const note = await Note.findById(chat.noteId);
            if (note) {
                try {
                    if (note.fileUrl) {
                        const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
                        const data = await pdf(response.data);
                        contextText = data.text.trim().substring(0, 12000);
                    }
                } catch (e) {
                    console.log("Context fetch error:", e.message);
                }
            }
        }

        const history = chat.messages.slice(-10);

        const aiText = await aiService.generateResponse(history, contextText);

        chat.messages.push({ role: 'ai', content: aiText });
        await chat.save();

        res.json({ reply: aiText });

    } catch (error) {
        console.error("Chat Message Error:", error);
        res.status(500).json({ error: "AI failed to respond. Please ensure API Limit not exceeded." });
    }
});

router.post("/api/chat/:id/message/stream", isLoggedIn, checkAccess, async (req, res) => {
    try {
        const chatId = req.params.id;
        const { message } = req.body;
        const chat = await Chat.findOne({ _id: chatId, user: req.user._id });

        if (!chat) return res.status(404).json({ error: "Chat not found." });

        chat.messages.push({ role: 'user', content: message });
        chat.lastActivity = Date.now();
        await chat.save();

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        let contextText = "";
        if (chat.noteId) {
            const note = await Note.findById(chat.noteId);
            if (note && note.fileUrl) {
                try {
                    const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
                    const data = await pdf(response.data);
                    contextText = data.text.trim().substring(0, 12000);
                } catch (e) {
                    console.log("Context fetch error:", e.message);
                }
            }
        }

        const history = chat.messages.slice(-10);
        let fullResponse = "";

        try {
            for await (const chunk of aiService.generateResponseStream(history, contextText)) {
                fullResponse += chunk;
                res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
            }

            res.write(`data: [DONE]\n\n`);

            chat.messages.push({ role: 'ai', content: fullResponse });
            await chat.save();

            res.end();
        } catch (streamError) {
            console.error("Streaming error:", streamError);
            res.write(`data: ${JSON.stringify({ error: "Streaming failed" })}\n\n`);
            res.end();
        }

    } catch (error) {
        console.error("Chat Streaming Error:", error);
        res.status(500).json({ error: "AI failed to respond." });
    }
});

router.delete("/api/chat/:id", isLoggedIn, checkAccess, async (req, res) => {
    try {
        await Chat.findOneAndDelete({ _id: req.params.id, user: req.user._id });
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: "Could not delete chat." });
    }
});

module.exports = router;
