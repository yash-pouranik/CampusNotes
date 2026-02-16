const { Queue } = require('bullmq');
const redisConnection = require("../config/redis")

const bulkEmailQueue = new Queue('bulkEmailQueue', {
    connection: redisConnection
});


async function addBulkEmailJob(data, delay = 0) {
    await bulkEmailQueue.add('sendBulkEmail', data, {
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

module.exports = { addBulkEmailJob };   
