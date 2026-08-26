require('dotenv').config();
const mongoose = require('mongoose');

async function fixLegacyNotes() {
  await mongoose.connect(process.env.MONGODB_URI);
  const db = mongoose.connection.db;
  const notesCol = db.collection('notes');
  const subjectsCol = db.collection('subjects');

  const allNotes = await notesCol.find({}).toArray();
  console.log(`Found ${allNotes.length} notes.`);

  for (const note of allNotes) {
    console.log(`Note: "${note.title}", subject: ${note.subject} (type: ${typeof note.subject})`);

    // Check if subject is NOT an ObjectId
    if (typeof note.subject === 'string' && !mongoose.Types.ObjectId.isValid(note.subject)) {
      const subjectName = note.subject.trim();
      // Find or create Subject document
      let subDoc = await subjectsCol.findOne({ name: subjectName });
      if (!subDoc) {
        const insertRes = await subjectsCol.insertOne({ name: subjectName, createdAt: new Date(), updatedAt: new Date() });
        subDoc = { _id: insertRes.insertedId, name: subjectName };
        console.log(`Created new Subject "${subjectName}" -> ID: ${subDoc._id}`);
      }
      // Update note with Subject ObjectId
      await notesCol.updateOne(
        { _id: note._id },
        { $set: { subject: subDoc._id } }
      );
      console.log(`[FIXED] Updated note "${note.title}" subject to ObjectId(${subDoc._id})`);
    } else if (typeof note.subject === 'string' && mongoose.Types.ObjectId.isValid(note.subject)) {
      // Convert string ID to actual BSON ObjectId
      await notesCol.updateOne(
        { _id: note._id },
        { $set: { subject: new mongoose.Types.ObjectId(note.subject) } }
      );
      console.log(`[FIXED] Converted note "${note.title}" subject string ID to BSON ObjectId`);
    }

    // Also normalize course and semester if needed
    let courseVal = note.course;
    if (courseVal === 'B. Tech') {
      courseVal = 'B.Tech CSE';
      await notesCol.updateOne({ _id: note._id }, { $set: { course: courseVal } });
      console.log(`[FIXED] Normalized course to ${courseVal}`);
    }

    let semVal = note.semester;
    if (!semVal) {
      semVal = 'V';
      await notesCol.updateOne({ _id: note._id }, { $set: { semester: semVal } });
      console.log(`[FIXED] Set default semester to ${semVal}`);
    }
  }

  console.log("All legacy notes fixed!");
  await mongoose.disconnect();
  process.exit(0);
}

fixLegacyNotes().catch(console.error);
