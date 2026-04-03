require('dotenv').config();
const { Worker } = require('bullmq');
const { sendOTP } = require("../config/mailer");
const redisConnection = require("../config/redis")


const worker = new Worker('otpEmailQueue', async job => {
    try {
        const { user, otp } = job.data;
        await sendOTP(user, otp);
    } catch (err) {
        if (err.code === 'QUOTA_EXCEEDED') {
            console.error(`🔴 HARD LIMIT REACHED: OTP for ${job.data.user.email} failed.`);
        }
        throw err;
    }
}, { connection: redisConnection });

worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
});

console.log("OTPEmail worker started, waiting for jobs...");
