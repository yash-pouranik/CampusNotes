require('dotenv').config();
const { Worker } = require('bullmq');
const { sendNewRequestMailOnce } = require("../config/mailer");
const redisConnection = require("../config/redis")


const worker = new Worker('bulkEmailQueue', async job => {
    const { email, requestData } = job.data;
    await sendNewRequestMailOnce(email, requestData);
}, { 
    connection: redisConnection,
    limiter: {
        max: 1, // 1 job
        duration: 60000 // per 60 seconds (1 minute)
    }
});

worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
});

console.log("BulkEmail worker started, waiting for jobs...");
