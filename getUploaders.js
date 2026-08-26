const mongoose = require('mongoose');
const User = require('./models/user');

require('dotenv').config();

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/campusnotes';

mongoose.connect(uri)
  .then(async () => {
    try {
      const users = await User.find({ 'notes.0': { $exists: true } }, '_id username email notes').lean();
      
      console.log(`\nFound ${users.length} users who have uploaded at least one note:\n`);
      
      const formattedUsers = users.map(u => ({
        UserId: u._id.toString(),
        Username: u.username,
        Email: u.email,
        UploadCount: u.notes.length
      }));
      
      console.table(formattedUsers);
      
      process.exit(0);
    } catch (err) {
      console.error("Error fetching users:", err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error("DB Connection Error:", err);
    process.exit(1);
  });
