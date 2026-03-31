const Redis = require("ioredis");
const dotenv = require("dotenv");
dotenv.config();

if (!process.env.REDIS_URL) {
    throw new Error("REDIS_URL is not defined in .env");
}

const redis = new Redis(process.env.REDIS_URL, {
    maxRetriesPerRequest: null
});

redis.on('ready', () => {
    console.log('ioredis client is connected and ready.');
});

redis.on('error', (err) => {
    console.error('❌ Redis Connection Error:', err.message);
});

module.exports = redis;