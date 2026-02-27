require('dotenv').config();
const { Worker } = require('bullmq');
const { sendNewRequestMailOnce } = require("../config/mailer");
const redisConnection = require("../config/redis");

// Rate limiter: 1 email per 60 seconds to avoid domain blocks
const worker = new Worker('bulkEmailQueue', async job => {
    const { email, requestData } = job.data;
    console.log(`📧 Sending mail to: ${email}`);
    await sendNewRequestMailOnce(email, requestData);
}, {
    connection: redisConnection,
    limiter: {
        max: 1,        // 1 email
        duration: 60000 // per 60 seconds
    }
});

worker.on('completed', job => {
    console.log(`✅ Job ${job.id} completed — mail sent to ${job.data.email}`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} failed for ${job.data.email}: ${err.message}`);
});

console.log("✅ BulkEmail worker started — 1 mail/min rate limiter active.");
