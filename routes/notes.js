const express = require("express");
const mongoose = require("mongoose")
const router = express.Router();
const Note = require("../models/note");
const Subject = require("../models/subject")
const DownloadLog = require("../models/downloadLog");
const { isLoggedIn, isModerator, checkAccess } = require("../middlewares");
const { sendVerificationMail } = require("../config/mailer");
const { cloudinary, getNextAccount } = require("../config/cloud");


const { marked } = require('marked');
const { createNoteSlug } = require('../utils/slugify');

// Helper to find note by ObjectId or Slug
async function findNoteByIdentifier(identifier, populateQuery = "") {
  let query;
  if (mongoose.Types.ObjectId.isValid(identifier)) {
    query = Note.findById(identifier);
  } else {
    query = Note.findOne({ slug: identifier });
  }
  if (populateQuery) {
    query = query.populate(populateQuery);
  }
  return await query;
}

router.get("/api/upload-signature", isLoggedIn, (req, res) => {
  const account = getNextAccount();

  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder: "campusNotes" },
    account.api_secret
  );

  res.json({
    signature,
    timestamp,
    cloudName: account.cloud_name,
    apiKey: account.api_key
  });
});


router.get("/upload", isLoggedIn, async (req, res) => {
  if (!req.user.verification?.verified && !req.user.roles?.isModerator) {
    req.flash("error", 'You are not verified! Verify <a href="/verify">here</a>');
    return res.redirect("/explore");
  }

  try {
    const subjects = await Subject.find().sort({ name: 1 });
    const courses = [
      "B.Tech CSE",
      "B.Tech IT",
      "B.Tech ECE",
      "B.Tech ME",
      "MBA",
      "BBA",
      "MCA",
      "BCA"
    ];

    const semester = [
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
    ]

    res.render("notes/upload", {
      title: "Upload Notes",
      subjects,
      courses,
      semester,
      "process.env.CLOUD_NAME": process.env.CLOUD_NAME,
      "process.env.CLOUD_API_KEY": process.env.CLOUD_API_KEY
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Could not load subjects");
    res.redirect("/explore");
  }
});


router.post("/upload", isLoggedIn, checkAccess, async (req, res) => {
  try {
    const { title, subject, course, visibility, newSubject, semester, fileUrl } = req.body;

    if (!fileUrl) {
      return res.status(400).json({ success: false, error: "File URL is missing." });
    }

    let subjectId;
    if (subject === "other" && newSubject) {
      let created = await Subject.findOneAndUpdate(
        { name: newSubject.trim() },
        { name: newSubject.trim() },
        { new: true, upsert: true }
      );
      subjectId = created._id;
    } else {
      subjectId = subject;
    }

    const copied = await Note.find({ title: title });

    if (copied.length < 1) {
      let slug = createNoteSlug(title, course, semester);
      const existingSlug = await Note.findOne({ slug });
      if (existingSlug) {
        slug = `${slug}-${Date.now().toString().slice(-4)}`;
      }

      const note = new Note({
        title,
        slug,
        description: "AI is analyzing this document to generate a high-quality description... Please check back shortly.",
        subject: subjectId,
        course,
        semester,
        fileUrl: fileUrl,
        uploadedBy: req.user._id,
      });
      await note.save();

      try {
          const { addDescriptionJob } = require('../queues/description.queue');
          await addDescriptionJob(note._id);
      } catch (qErr) {
          console.error("Queue dispatch error:", qErr);
      }

      req.flash("success", "Note uploaded! It will appear in the library once a moderator verifies it.");
      res.json({ success: true, redirectUrl: "/explore" });
    } else {
      res.status(409).json({ success: false, error: "A note with this title already exists." });
    }

  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: "Something went wrong while saving the note." });
  }
});


router.get("/most-downloaded", async (req, res) => {
  try {
    const notes = await Note.find({ downloadCount: { $gt: 0 } })
      .sort({ downloadCount: -1 })
      .populate("subject uploadedBy")
      .lean()
      .limit(80);

    res.render("notes/mostDownloaded", { notes, title: "Most Downloaded Notes | CampusNotes" });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong")
    res.redirect("/explore");
  }
});


router.get("/notes/:nid", async (req, res) => {
  try {
    const { nid } = req.params;
    let file = null;

    // 1. If accessed via MongoDB ObjectId, perform a 301 Permanent Redirect to the slug URL for SEO
    if (mongoose.Types.ObjectId.isValid(nid)) {
      file = await Note.findById(nid)
        .populate("subject", "name")
        .populate("uploadedBy", "username name roles verification");

      if (file) {
        if (!file.slug) {
          file.slug = createNoteSlug(file.title, file.course, file.semester);
          await file.save();
        }
        return res.redirect(301, `/notes/${file.slug}`);
      }
    }

    // 2. Fetch note by slug
    if (!file) {
      file = await Note.findOne({ slug: nid })
        .populate("subject", "name")
        .populate("uploadedBy", "username name roles verification");
    }

    if (!file) {
      req.flash("error", "Note doesn't exist!");
      return res.redirect("/explore");
    }

    const subId = file.subject ? file.subject._id : null;
    const fileSemester = file.semester;

    const subjectNotes = subId ? await Note.find({ subject: subId, _id: { $ne: file._id } })
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification")
      .sort({ createdAt: -1 })
      .limit(6) : [];

    const semNotes = fileSemester ? await Note.find({ semester: fileSemester, _id: { $ne: file._id } })
      .populate("subject", "name")
      .populate("uploadedBy", "username name roles verification")
      .sort({ createdAt: -1 })
      .limit(6) : [];

    // Parse Markdown description to clean Server-Side Rendered HTML for Googlebot
    const descriptionHtml = file.description ? marked.parse(file.description) : "";

    // Generate Schema.org JSON-LD structured data for Google Rich Results
    const schemaData = {
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "LearningResource",
          "@id": `https://campusnotes.bitbros.in/notes/${file.slug || file._id}#learningresource`,
          "name": file.title,
          "description": file.description ? file.description.slice(0, 200).replace(/[*#]/g, '') : `${file.title} study notes and PDF for ${file.course}`,
          "educationalLevel": file.course,
          "learningResourceType": ["Study Notes", "Exam Questions", "Revision Notes"],
          "educationalUse": "Study and Exam Preparation",
          "inLanguage": "en",
          "provider": {
            "@type": "Organization",
            "name": "CampusNotes",
            "url": "https://campusnotes.bitbros.in"
          },
          "author": {
            "@type": "Person",
            "name": file.uploadedBy?.name || file.uploadedBy?.username || "CampusNotes Student"
          },
          "datePublished": file.createdAt ? new Date(file.createdAt).toISOString() : new Date().toISOString(),
          "dateModified": file.updatedAt ? new Date(file.updatedAt).toISOString() : new Date().toISOString()
        },
        {
          "@type": "BreadcrumbList",
          "itemListElement": [
            {
              "@type": "ListItem",
              "position": 1,
              "name": "Home",
              "item": "https://campusnotes.bitbros.in"
            },
            {
              "@type": "ListItem",
              "position": 2,
              "name": "Explore Notes",
              "item": "https://campusnotes.bitbros.in/explore"
            },
            {
              "@type": "ListItem",
              "position": 3,
              "name": file.course || "Courses",
              "item": `https://campusnotes.bitbros.in/explore?course=${encodeURIComponent(file.course || '')}`
            },
            {
              "@type": "ListItem",
              "position": 4,
              "name": file.title,
              "item": `https://campusnotes.bitbros.in/notes/${file.slug || file._id}`
            }
          ]
        }
      ]
    };

    res.render("notes/eachNote", {
      note: file,
      descriptionHtml,
      schemaData: JSON.stringify(schemaData),
      subjectNotes,
      semNotes,
      title: `${file.title} | ${file.subject?.name ? file.subject.name + ' - ' : ''}${file.course || 'SVVV'} Notes & PYQs - CampusNotes`,
      description: file.description ? file.description.slice(0, 160).replace(/[*#\n]/g, ' ') : `Download verified study notes and PDF for ${file.title} (${file.course} Sem ${file.semester}) at SVVV & RGPV on CampusNotes.`
    });
  } catch (e) {
    console.error(e);
    req.flash("error", "Server Error")
    res.status(500).redirect("/explore");
  }
});

router.get("/notes/:nid/download", async (req, res) => {
  try {
    const note = await findNoteByIdentifier(req.params.nid);
    if (!note) {
      return res.status(404).send("Note not found");
    }

    note.downloadCount = (note.downloadCount || 0) + 1;
    await note.save();

    let downloaderId = req.cookies.downloaderId;
    if (!downloaderId) {
      downloaderId = new mongoose.Types.ObjectId().toString();
      res.cookie("downloaderId", downloaderId, {
        maxAge: 365 * 24 * 60 * 60 * 1000,
        httpOnly: true,
      });
    }

    const ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

    const existingLog = await DownloadLog.findOne({
      note: note._id,
      downloaderId: downloaderId,
    });

    if (!existingLog) {
      await DownloadLog.create({
        note: note._id,
        downloaderId,
        ip,
        source: req.cookies.utm_source || "Direct"
      });
    }

    return res.redirect(note.fileUrl);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Something went wrong");
  }
});


router.get("/explore", async (req, res) => {
  try {
    console.time("/explore")
    const { q, course, semester, visibility } = req.query;

    let filter = { isVerified: { $ne: false } };

    if (q) {
      filter.$text = { $search: q };
    }
    if (course && course !== "all") {
      filter.course = course;
    }
    if (semester && semester !== "all") {
      filter.semester = semester;
    }
    if (visibility && visibility !== "all") {
      filter.visibility = visibility;
    }

    const page = parseInt(req.query.page) || 1;
    const limit = 20;
    const skip = (page - 1) * limit;

    console.time("Explore-db");
    const [notes, totalNotes] = await Promise.all([
      Note.find(filter, q ? { score: { $meta: "textScore" } } : {})
        .select("title slug description subject uploadedBy course semester createdAt fileUrl downloadCount")
        .populate("subject", "name")
        .populate("uploadedBy", "username name avatar roles verification")
        .sort(q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Note.countDocuments(filter)
    ]);
    console.timeEnd("Explore-db");
    const totalPages = Math.ceil(totalNotes / limit);

    if (req.xhr || req.headers.accept.indexOf('json') > -1) {
      return res.json({
        notes,
        currentPage: page,
        totalPages
      });
    }

    let pageTitle = "Explore SVVV & RGPV Notes, Study Materials & PYQs | CampusNotes";
    let pageDesc = "Browse and download free verified handwritten notes, previous year question papers (PYQs), and unit-wise exam notes for SVVV, RGPV, B.Tech CSE, IT, MBA, MCA, and BCA.";

    if (q) {
      pageTitle = `"${q}" - Notes & Study Material | CampusNotes`;
      pageDesc = `Download free study materials, unit notes, and PYQ question papers for "${q}" on CampusNotes.`;
    } else if (course && course !== "all") {
      pageTitle = `${course} Notes & PYQs ${semester && semester !== "all" ? 'Sem ' + semester : ''} | SVVV & RGPV - CampusNotes`;
      pageDesc = `Download free verified notes, assignments, and exam preparation resources for ${course} ${semester && semester !== "all" ? 'Semester ' + semester : ''} students.`;
    }

    console.timeEnd("/explore");
    console.time("ejs-render")
    res.render("notes/explore", {
      notes,
      query: q,
      course,
      semester,
      visibility,
      currentPage: page,
      totalPages,
      title: pageTitle,
      description: pageDesc,
    });
    console.timeEnd("ejs-render");
  } catch (err) {
    console.error("❌ Explore Error:", err);
    res.status(500).send("Server error while fetching notes.");
  }
});


router.get("/notes/:nid/edit", isLoggedIn, checkAccess, async (req, res) => {
  try {
    const file = await findNoteByIdentifier(req.params.nid, "uploadedBy subject");

    if (!file) {
      req.flash("error", "Note doesn't exist!");
      return res.redirect("/explore");
    }

    const noteId = file.slug || file._id;

    const isOwner = file.uploadedBy._id.toString() === req.user._id.toString();
    const isModerator = req.user.roles?.isModerator;
    const isDev = req.user.roles?.isDev;

    if (!isOwner && !isModerator && !isDev) {
      req.flash("error", "You are not authorized to do this");
      return res.redirect(`/notes/${noteId}`);
    }

    const subjects = await Subject.find().sort({ name: 1 });
    const courses = [
      "B.Tech CSE",
      "B.Tech IT",
      "B.Tech ECE",
      "B.Tech ME",
      "MBA",
      "BBA",
      "MCA",
      "BCA"
    ];

    const semester = [
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
    ];

    res.render("notes/editNote", {
      note: file,
      subjects,
      courses,
      semester,
      title: `${file.title} | campusnotes`
    });
  } catch (e) {
    console.error(e);
    req.flash("error", "Some error at our end.");
    return res.status(500).redirect("/explore");
  }
});


router.put('/notes/:id', isLoggedIn, checkAccess, async (req, res) => {
  try {
    const note = await findNoteByIdentifier(req.params.id, "uploadedBy");

    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect("/explore");
    }

    const isOwner = note.uploadedBy._id.toString() === req.user._id.toString();
    const isModerator = req.user.roles?.isModerator;
    const isDev = req.user.roles?.isDev;

    if (!isOwner && !isModerator && !isDev) {
      req.flash("error", "You are not authorized to edit this note");
      return res.redirect(`/notes/${note.slug || note._id}`);
    }

    if (!mongoose.Types.ObjectId.isValid(req.body.subject)) {
      req.flash("error", "Invalid subject selected");
      return res.redirect(`/notes/${note.slug || note._id}/edit`);
    }

    let updatedSlug = note.slug;
    if (req.body.title && req.body.title !== note.title) {
      updatedSlug = createNoteSlug(req.body.title, req.body.course || note.course, req.body.semester || note.semester);
    }

    await Note.findByIdAndUpdate(note._id, {
      title: req.body.title,
      slug: updatedSlug,
      description: req.body.description,
      tags: req.body.tags ? req.body.tags.split(',').map(t => t.trim()) : [],
      subject: req.body.subject,
      course: req.body.course,
      fileUrl: note.fileUrl
    });

    req.flash("success", "Note updated successfully");
    res.redirect(`/notes/${updatedSlug || note._id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Error updating note");
    res.redirect(`/explore`);
  }
});


router.delete("/notes/:id", isLoggedIn, checkAccess, async (req, res) => {
  try {
    const note = await findNoteByIdentifier(req.params.id);

    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect("/explore");
    }

    if (
      note.uploadedBy.toString() !== req.user._id.toString() &&
      !req.user.roles?.isModerator
    ) {
      req.flash("error", "You are not authorized to delete this note");
      return res.redirect(`/notes/${note.slug || note._id}`);
    }

    if (note.fileUrl) {
      try {
        const urlParts = note.fileUrl.split('/');
        const uploadIndex = urlParts.indexOf('upload');
        if (uploadIndex > -1 && urlParts.length > uploadIndex + 2) {
          const resourceType = urlParts[uploadIndex - 1];
          const publicIdWithFolder = urlParts.slice(uploadIndex + 2).join('/').split('.')[0];

          if (resourceType && publicIdWithFolder) {
            await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: resourceType });
          }
        }
      } catch (cloudErr) {
        console.warn("Cloudinary delete error:", cloudErr.message);
      }
    }

    await mongoose.model("User").updateOne(
      { _id: note.uploadedBy },
      { $pull: { notes: note._id } }
    );

    await note.deleteOne();

    req.flash("success", "Note deleted successfully!");
    res.redirect("/explore");
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong while deleting");
    res.redirect("/explore");
  }
});


router.get('/admin/verify-notes', isModerator, async (req, res) => {
  try {
    const unverifiedNotes = await Note.find({ isVerified: false })
      .populate('uploadedBy', 'username email roles')
      .populate("subject", "name");

    res.render('admin/verifyNotes', {
      title: "Verify Notes | Admin",
      unverifiedNotes
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Failed to load unverified notes");
    res.redirect("/explore");
  }
});


router.post('/admin/verify-notes', isModerator, async (req, res) => {
  const { noteId, action } = req.body;

  if (!noteId || !action) {
    req.flash("error", "Missing note ID or action");
    return res.redirect('/admin/verify-notes');
  }

  try {
    const note = await Note.findById(noteId).populate('uploadedBy');
    if (!note) {
      req.flash("error", "Note not found");
      return res.redirect('/admin/verify-notes');
    }

    if (action === 'accept') {
      if (note.uploadedBy) {
        const alreadyExists = note.uploadedBy.notes.some(
          nId => nId.toString() === note._id.toString()
        );
        if (!alreadyExists) {
          note.uploadedBy.notes.push(note._id);
          await note.uploadedBy.save();
        }
      }
      note.isVerified = true;
      await note.save();
      sendVerificationMail(note.uploadedBy.email, "Accepted")
      req.flash("success", "Note verified successfully");
    }

    else if (action === 'reject') {
      try {
        const urlParts = note.fileUrl.split('/');
        const publicIdWithFolder = urlParts.slice(urlParts.indexOf('upload') + 1).join('/').split('.')[0];
        await cloudinary.uploader.destroy(publicIdWithFolder, { resource_type: "raw" });
      } catch (cloudErr) {
        console.error("Cloudinary delete error:", cloudErr);
      }
      await Note.findByIdAndDelete(noteId);
      sendVerificationMail(note.uploadedBy.email, "Rejected")
      req.flash("success", "Note rejected and deleted");
    }

    res.redirect('/admin/verify-notes');
  } catch (err) {
    console.error("Admin note processing error:", err);
    req.flash("error", "Error processing note");
    res.redirect('/admin/verify-notes');
  }
});


router.post("/notes/:nid/upvote", isLoggedIn, checkAccess, async (req, res) => {
  try {
    const note = await findNoteByIdentifier(req.params.nid);
    if (!note) return res.status(404).send("Note not found");

    const userId = req.user._id;

    if (note.upvotes.includes(userId)) {
      note.upvotes.pull(userId);
    } else {
      note.upvotes.push(userId);
    }

    await note.save();
    res.redirect(`/notes/${note.slug || note._id}`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});


module.exports = router;
