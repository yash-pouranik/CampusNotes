require('dotenv').config();
const { Worker } = require('bullmq');
const redisConnection = require("../config/redis")
const {getAllUsers} = require("../processors/bg.process");



const worker = new Worker('bgQueue', async job => {
    const {requestData} = job.data;
    console.log("-----------------in worker of bg process--------------------")
    console.log(requestData);
    await getAllUsers(requestData);
    console.log("-----------------in worker of bg process--------------------")
}, { connection: redisConnection });

worker.on('completed', job => {
    console.log(`Job ${job.id} completed successfully`);
});

worker.on('failed', (job, err) => {
    console.log(`Job ${job.id} failed with error: ${err.message}`);
});

console.log("BG Process Worker, waiting for jobs...");
