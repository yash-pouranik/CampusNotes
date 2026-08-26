require('dotenv').config();
const mongoose = require('mongoose');

async function fixVerification() {
  await mongoose.connect(process.env.MONGODB_URI);
  const res = await mongoose.connection.db.collection('notes').updateMany(
    { isVerified: { $ne: false } },
    { $set: { isVerified: true } }
  );
  console.log('Updated notes isVerified count:', res.modifiedCount);
  await mongoose.disconnect();
  process.exit(0);
}

fixVerification().catch(console.error);
