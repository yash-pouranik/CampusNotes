const mongoose = require('mongoose');
const User = require('./models/user');
require('dotenv').config();

const prodUri = process.env.MONGODB_URI_PROD || "mongodb+srv://campusnotes:nlNLnKanJJRoSQuF@cluster0.fuqawtv.mongodb.net/main?appName=Cluster0";

mongoose.connect(prodUri)
  .then(async () => {
    try {
      const users = await User.find({ 'notes.0': { $exists: true } }, '_id username email name').lean();
      
      const formatted = users.map(u => ({
        id: u._id.toString(),
        name: u.name,
        username: u.username,
        email: u.email
      }));
      
      console.log(JSON.stringify(formatted, null, 2));
      
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })
  .catch(err => {
    console.error(err);
    process.exit(1);
  });
