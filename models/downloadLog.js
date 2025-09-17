const mongoose = require("mongoose");

const downloadLogSchema = new mongoose.Schema({
  note: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Note",
    required: true,
  },
  downloaderId: {
    type: String,
    required: true,
  },
  ip: {
    type: String, // user ka IP bhi log hoga
  },
  downloadedAt: {
    type: Date,
    default: Date.now,
  },
});

downloadLogSchema.index({ note: 1, downloaderId: 1 }, { unique: true });

module.exports = mongoose.model("DownloadLog", downloadLogSchema);