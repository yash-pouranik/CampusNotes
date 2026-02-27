
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const RequestNote = require('../models/reqNotes');
const User = require('../models/user');
const { queueBulkEmails } = require('../queues/bulkEmail.queue');

const REQUEST_ID = '699d55cc98fc88bfcb90fb26'; 


async function run() {
    try {
        await connectDB();
        console.log('✅ DB connected.');

        const request = await RequestNote.findById(REQUEST_ID)
            .populate('user', 'username name email');

        if (!request) {
            console.error(`❌ No RequestNote found with ID: ${REQUEST_ID}`);
            process.exit(1);
        }

        console.log(`📋 Found request: "${request.content}" by ${request.user.username || request.user.name}`);

        const requestData = {
            _id: request.user._id,
            user: request.user,
            content: request.content,
            postedBy: request.user.username || request.user.name,
        };

        await queueBulkEmails(requestData);

        // Give the queue a moment to confirm jobs are added
        setTimeout(async () => {
            console.log('🎉 Done. Jobs queued — worker will send at 1 mail/min.');
            console.log('   Leave server running. Check logs for "✅ Job completed" entries.');
            process.exit(0);
        }, 2000);

    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

run();