require('dotenv').config();
const mongoose = require('mongoose');
const { createNoteSlug } = require('../utils/slugify');

async function migrateSlugs() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      console.error("MONGODB_URI is missing in .env!");
      process.exit(1);
    }

    console.log("Connecting to MongoDB...");
    await mongoose.connect(mongoUri);
    console.log("Connected to MongoDB successfully.");

    const notesCollection = mongoose.connection.db.collection('notes');
    const notes = await notesCollection.find({}).toArray();
    console.log(`Found ${notes.length} total notes.`);

    let updatedCount = 0;
    const usedSlugs = new Set();

    // First, collect existing slugs
    for (const note of notes) {
      if (note.slug) {
        usedSlugs.add(note.slug);
      }
    }

    for (const note of notes) {
      let baseSlug = createNoteSlug(note.title || 'untitled-note', note.course || '', note.semester || '');
      let finalSlug = baseSlug;
      let counter = 1;

      // Handle collisions if finalSlug is already used by another note
      while (usedSlugs.has(finalSlug) && note.slug !== finalSlug) {
        finalSlug = `${baseSlug}-${counter}`;
        counter++;
      }

      if (note.slug !== finalSlug) {
        await notesCollection.updateOne(
          { _id: note._id },
          { $set: { slug: finalSlug } }
        );
        usedSlugs.add(finalSlug);
        updatedCount++;
        console.log(`[UPDATED] Note ID: ${note._id} -> Slug: ${finalSlug}`);
      } else {
        console.log(`[SKIPPED] Note ID: ${note._id} already has slug: ${note.slug}`);
      }
    }

    console.log(`\n🎉 Migration complete! ${updatedCount} notes updated with SEO slugs.`);
    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error("Migration error:", err);
    process.exit(1);
  }
}

migrateSlugs();
