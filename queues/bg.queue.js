const { Queue } = require('bullmq');
const redisConnection = require("../config/redis")

const bgQueue = new Queue('bgQueue', {
    connection: redisConnection
});


async function addBgJob(data, delay = 0) {
    await bgQueue.add('bgQueue', data, {
        delay: delay,
        attempts: 3, // Retry up to 3 times on failure
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
        removeOnComplete: true,
    });
    console.log(`Bg job added to queue with delay: ${delay}ms`);
}

module.exports = { addBgJob };   
