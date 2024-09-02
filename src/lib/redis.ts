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

redis.on('ready', () => {
    console.log('Redis connection is ready');
});

// Helper type to extract method names of the Redis instance
type RedisMethodNames = {
    [K in keyof Redis]: Redis[K] extends (...args: any[]) => any ? K : never;
}[keyof Redis];

// Wrap Redis methods with performance logging
const wrapRedisMethod = (methodName: RedisMethodNames) => {
    // Ensure methodName is defined and valid
    if (methodName && typeof redis[methodName] === 'function') {
        const originalMethod = redis[methodName] as (...args: any[]) => any;
        redis[methodName] = function (...args: any[]) {
            const start = Date.now();
            const result = originalMethod.apply(redis, args);
            if (result instanceof Promise) {
                return result.finally(() => {
                    console.log(`Redis ${methodName} took ${Date.now() - start}ms`);
                });
            }
            console.log(`Redis ${methodName} took ${Date.now() - start}ms`);
            return result;
        };
    }
};

// Wrap common Redis methods
['get', 'set', 'lrange', 'lpush', 'rpush'].forEach(method => {
    wrapRedisMethod(method as RedisMethodNames);
});

redis.ping().then(() => {
    console.log('Successfully pinged Redis server');
}).catch((error) => {
    console.error('Failed to ping Redis server:', error);
});

export default redis;