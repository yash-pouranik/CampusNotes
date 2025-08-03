const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    required: true 
  },
  name: {                     // 👈 NEW: Display name (optional)
    type: String,
    required: false
  },
  course: {                   // 👈 NEW: For showing on homepage
    type: String,
    required: false
  },
  avatar: {                   // 👈 Optional profile picture
    type: String,
    default: "/images/dummy_profile.avif"
  },
  email: { 
    type: String, 
    unique: true, 
    required: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  uploaded: {
    type: Number,
    default: 0,
  },
  downloadedNotes: {
    type: Number,
    default: 0,
  },
  notes: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Note"
    }
  ]

});




// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});



// Password verification method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
