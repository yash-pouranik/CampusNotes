const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  tags: [String], // e.g. ["math", "sem3", "algebra"]

  fileUrl: {
    type: String,
    required: true,
  },

  uploadedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  downloadCount: {
    type: Number,
    default: 0,
  },

  subject: String,
  course: String,
  college: {
    type: String,
    default: "SVVV, Indore",
  },

  uploadedAt: {
    type: Date,
    default: Date.now,
  },
  isVerified: {
    type: Boolean,
    default: false,
  }
});

module.exports = mongoose.model("Note", noteSchema);
