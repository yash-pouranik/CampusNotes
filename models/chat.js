const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const messageSchema = new Schema({
    role: {
        type: String,
        enum: ['user', 'ai', 'system'],
        required: true
    },
    content: {
        type: String,
        required: true
    },
    timestamp: {
        type: Date,
        default: Date.now
    }
});

const chatSchema = new Schema({
    user: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true
    },
    noteId: {
        type: Schema.Types.ObjectId,
        ref: "Note",
        default: null
    },
    noteTitle: {
        type: String,
        default: "General Chat"
    },
    title: {
        type: String,
        default: "New Chat"
    },
    messages: [messageSchema],
    lastActivity: {
        type: Date,
        default: Date.now
    }
}, { timestamps: true });

module.exports = mongoose.model("Chat", chatSchema);
