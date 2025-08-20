const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema({
  title: { 
    type: String, 
    required: true, 
    trim: true 
  },
  description: { 
    type: String, 
    trim: true 
  },
  subject: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Subject", 
    required: true 
  },
  course: { 
    type: String,
    enum: [
      "B.Tech CSE", 
      "B.Tech IT", 
      "B.Tech ECE", 
      "B.Tech ME", 
      "MBA", 
      "BBA", 
      "MCA", 
      "BCA"
    ],
    required: true
  },
  semester: { 
    type: String,
    enum: [
      "I", 
      "II", 
      "III", 
      "IV", 
      "V", 
      "VI", 
      "VII", 
      "VIII",
      "IX",
      "X"
    ],
    required: true
  },
  fileUrl: { 
    type: String, 
    required: true 
  },
  uploadedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "User", 
    required: true 
  },
  downloadCount: { 
    type: Number, 
    default: 0 
  },
  visibility: { 
    type: String, 
    enum: ["public", "private"], 
    default: "public" 
  },
  isVerified: { 
    type: Boolean, 
    default: false 
  },
  upvotes: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "User" 
    }
  ]

}, {
  timestamps: true
});

module.exports = mongoose.model("Note", noteSchema);
