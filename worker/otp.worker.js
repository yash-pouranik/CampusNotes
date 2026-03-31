require('dotenv').config();
const { Worker } = require('bullmq');
const { sendOTP } = require("../config/mailer");
const redisConnection = require("../config/redis")


const worker = new Worker('otpEmailQueue', async job => {
    const { user, otp } = job.data;
    await sendOTP(user, otp);
}, { connection: redisConnection });

worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
});

console.log("OTPEmail worker started, waiting for jobs...");
