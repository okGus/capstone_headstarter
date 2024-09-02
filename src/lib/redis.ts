import assert from "assert";
import { Redis } from "ioredis";

assert(process.env.REDIS_URL !== undefined, 'REDIS_URL is undefined');
const redis = new Redis(process.env.REDIS_URL, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        console.log(`Retrying Redis connection, attemp ${times}`);
        return delay;
    }
});

redis.on('error', (error) => {
    console.error('Redis error:', error);
});

redis.on('connect', () => {
    console.log('Successfully connected to Redis');
});

export default redis;