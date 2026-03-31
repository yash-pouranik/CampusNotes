require('dotenv').config();
const { Worker } = require('bullmq');
const axios = require('axios');
const pdf = require('pdf-parse');
const Note = require("../models/note");
const aiService = require("../services/ai");
const redisConnection = require("../config/redis");

const worker = new Worker('aiDescriptionQueue', async job => {
    const { noteId } = job.data;
    console.log(`Processing AI Description for Note: ${noteId}`);
    
    try {
        const note = await Note.findById(noteId).populate("subject");
        if (!note) {
            console.error(`Note ${noteId} not found in worker.`);
            return;
        }

        // 1. Download the PDF buffer
        console.log(`Downloading PDF to extract text: ${note.fileUrl}`);
        const response = await axios.get(note.fileUrl, { responseType: 'arraybuffer' });
        const pdfBuffer = Buffer.from(response.data);

        // 2. Extract Text using pdf-parse
        let extractedText = "";
        try {
            const pdfData = await pdf(pdfBuffer);
            extractedText = pdfData.text || "";
        } catch (pdfErr) {
            console.warn("Could not parse PDF text, relying on metadata for description.");
        }

        // 3. Generate Description from AI (Using Groq/Text fallback)
        const metadata = {
            title: note.title,
            subject: note.subject ? note.subject.name : "General Study Material",
            course: note.course
        };

        // If handwriting/image PDF, extractedText will be empty. 
        // Our service handles this by providing a summary based on Title/Subject.
        let aiDescription = "";
        if (extractedText.trim().length > 100) {
            aiDescription = await aiService.generateDescriptionFromText(extractedText, metadata);
        } else {
            // Fallback for image-only or very short PDFs
            const fallbackPrompt = [
                { 
                    role: 'user', 
                    content: `Generate a 250-word SEO-friendly description for a study resource titled "${metadata.title}" for ${metadata.course} in ${metadata.subject}. 
                    It appears to be a handwritten or image-based document. Explain that it provides practical insights and covers key subject topics to help students prepare for exams. 
                    Use bullet points to list potential theoretical concepts usually covered in ${metadata.subject}.` 
                }
            ];
            aiDescription = await aiService.generateResponse(fallbackPrompt);
        }

        // 4. Update the Note in database
        note.description = aiDescription.trim();
        await note.save();

        console.log(`Successfully generated and saved AI description (via Groq) for Note: ${noteId}`);
    } catch (err) {
        console.error(`Error in Description Worker for Note ${noteId}:`, err.message);
        throw err; 
    }
}, { 
    connection: redisConnection,
    concurrency: 2 
});

worker.on('completed', job => {
    console.log(`Job ${job.id} (AI Description) completed successfully`);
});

worker.on('failed', (job, err) => {
    console.error(`Job ${job.id} (AI Description) failed: ${err.message}`);
});

console.log("AI Description worker (Groq Mode) started...");

module.exports = worker;
