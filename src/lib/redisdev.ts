import assert from "assert";
import { Redis } from "ioredis";

assert(process.env.REDIS_URL !== undefined, 'REDIS_URL is undefined');
const redisdev = new Redis(process.env.REDIS_URL, {
    connectTimeout: 10000,
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        console.log(`Retrying Redis connection, attempt ${times}`);
        return delay;
    }
});

redisdev.on('error', (error) => {
    console.error('Redis error:', error);
});

redisdev.on('connect', () => {
    console.log('Successfully connected to Redis');
});

// Helper type to extract method names of the Redis instance
type RedisMethodNames = {
    [K in keyof Redis]: Redis[K] extends (...args: any[]) => any ? K : never;
}[keyof Redis];

// Wrap Redis methods with performance logging
const wrapRedisMethod = (methodName: RedisMethodNames) => {
    // Ensure methodName is defined and valid
    if (methodName && typeof redisdev[methodName] === 'function') {
        const originalMethod = redisdev[methodName] as (...args: any[]) => any;
        redisdev[methodName] = function (...args: any[]) {
            const start = Date.now();
            const result = originalMethod.apply(redisdev, args);
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

export default redisdev;