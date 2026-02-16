require('dotenv').config();
const { Worker } = require('bullmq');
const nodemailer = require('nodemailer');
const { sendOTP } = require("../config/mailer");
const redisConnection = require("../config/redis")

// // Your email sending utility (e.g., using nodemailer)
// const sendEmail = async (to, subject, body) => {
//     // Nodemailer transport setup goes here
//     // ...
//     console.log(`Sending email to ${to} with subject: ${subject}`);
//     // Example: await transporter.sendMail(...)
// };

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
