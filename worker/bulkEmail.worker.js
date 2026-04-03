require('dotenv').config();
const { Worker } = require('bullmq');
const { sendNewRequestMailOnce, sendInvitationMail } = require("../config/mailer");
const redisConnection = require("../config/redis");

const worker = new Worker('bulkEmailQueue', async job => {
    const { email } = job.data;
    console.log(`📧 Processing ${job.name} for: ${email}`);

    try {
        if (job.name === 'sendBulkEmail' || job.name === 'sendNewRequestMail') {
            const { requestData } = job.data;
            await sendNewRequestMailOnce(email, requestData);
        } else if (job.name === 'sendInvitationEmail') {
            const { name, stats } = job.data;
            await sendInvitationMail(email, name, stats);
        } else {
            // Default fallback for legacy jobs
            await sendNewRequestMailOnce(email, job.data.requestData);
        }
    } catch (err) {
        console.error(`❌ Error in worker handler for ${job.id}:`, err.message);
        throw err;
    }
}, {
    connection: redisConnection,
    limiter: {
        max: 2,       
        duration: 10000 // 2 per 10 seconds -> 12 per minute
    }
});

worker.on('completed', job => {
    console.log(`✅ Job ${job.id} (${job.name}) completed — mail sent to ${job.data.email}`);
});

worker.on('failed', (job, err) => {
    console.error(`❌ Job ${job.id} (${job.name}) failed for ${job.data.email}: ${err.message}`);
});

console.log("✅ BulkEmail worker started — Optimized for invitations & requests.");
