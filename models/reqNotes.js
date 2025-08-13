// models/reqNotes.js
const mongoose = require("mongoose");

const commentSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, trim: true, maxlength: 200 },
  createdAt: { type: Date, default: Date.now }
});

const requestNoteSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true, maxlength: 280 },
  comments: [commentSchema]
}, { timestamps: true });

module.exports = mongoose.model("RequestNote", requestNoteSchema);
