const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
  username: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true
  },
  name: { 
    type: String,
    trim: true
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
  avatar: { 
    type: String, 
    default: "/images/dummy_profile.avif" 
  },
  email: { 
    type: String, 
    unique: true, 
    required: true,
    trim: true
  },
  password: { 
    type: String, 
    required: true, 
    select: false // will not be returned by default in queries
  },
  gender: {
    type: String,
    enum: ["He/Him", "She/Her", "They/Them", "Other"],
    default: "He/Him"
  },
  notes: [
    { 
      type: mongoose.Schema.Types.ObjectId, 
      ref: "Note" 
    }
  ],
  verification: {
    docUrl: { type: String }, // URL/path of verification document
    verified: { type: Boolean, default: false },
    verifiedAt: { type: Date }
  },
  roles: {
    isModerator: { type: Boolean, default: false },
    isDev: { type: Boolean, default: false }
  },
  socialLinks: {
    linkedin: { type: String, default: null },
    github: { type: String, default: null }
  }
}, {
  timestamps: true
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare passwords
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model("User", userSchema);
