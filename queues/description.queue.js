const { Queue } = require('bullmq');
const redisConnection = require("../config/redis")

const descriptionQueue = new Queue('aiDescriptionQueue', {
    connection: redisConnection
});

async function addDescriptionJob(noteId, delay = 0) {
    await descriptionQueue.add('generateDescription', { noteId }, {
        delay: delay,
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 10000, // 10s backoff
        },
        removeOnComplete: true,
    });
    console.log(`AI Description job added to queue for noteId: ${noteId}`);
}

module.exports = { addDescriptionJob, descriptionQueue };
