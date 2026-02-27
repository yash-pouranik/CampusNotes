const { Queue } = require('bullmq');
const redisConnection = require("../config/redis");
const User = require("../models/user");

const bulkEmailQueue = new Queue('bulkEmailQueue', {
    connection: redisConnection
});


async function queueBulkEmails(requestData) {
    try {
        const users = await User.find(
            { _id: { $ne: requestData._id } },
            "email"
        );

        if (!users.length) {
            console.log("⚠️ No users to email.");
            return;
        }

        for (const user of users) {
            await bulkEmailQueue.add(
                'sendBulkEmail',
                { email: user.email, requestData },
                {
                    attempts: 3,
                    backoff: { type: 'exponential', delay: 5000 },
                    removeOnComplete: true,
                    removeOnFail: false,
                }
            );
        }

        console.log(`✅ Queued ${users.length} email jobs for bulk send.`);
    } catch (err) {
        console.error("❌ Error queueing bulk emails:", err.message);
    }
}

module.exports = { queueBulkEmails };
