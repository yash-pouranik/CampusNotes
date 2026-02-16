const { Queue } = require('bullmq');
const redisConnection = require("../config/redis")

const emailQueue = new Queue('otpEmailQueue', {
    connection: redisConnection
});


async function addEmailJob(data, delay = 0) {
    await emailQueue.add('sendWelcomeEmail', data, {
        delay: delay,
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
    });
    console.log(`Email job added to queue with delay: ${delay}ms`);
}

module.exports = { addEmailJob };
