const Redis = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined in .env");
}

// BullMQ requires a TCP Redis connection (ioredis), NOT an HTTP one (@upstash/redis)
const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null // Required by BullMQ
});

redis.on('ready', () => {
    console.log('ioredis client is connected and ready.');
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
});

module.exports = redis;