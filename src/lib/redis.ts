import assert from "assert";
import { Cluster, ClusterOptions, Redis } from "ioredis";
import fs from "fs";
import path from "path";

assert(process.env.REDIS_URL !== undefined, 'REDIS_URL is undefined');

const caCertPath = path.join(process.cwd(), 'AmazonRootCA1.pem');

const redisOptions: ClusterOptions = {
    redisOptions: {
        tls: {
            ca: fs.readFileSync(caCertPath),
            rejectUnauthorized: true
        },
        connectTimeout: 20000,
        maxRetriesPerRequest: 3,
    },
    clusterRetryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Retrying Redis connection, attemp ${times}`);
        return delay;
    },
}

const redis = new Redis.Cluster(
    [
        {
            host: process.env.REDIS_URL,
            port: 6379
        }
    ],
    redisOptions
);

redis.on('error', (error) => {
    console.error('Redis error:', error);
});

redis.on('connect', () => {
    console.log('Successfully connected to Redis cluster');
});

redis.on('ready', () => {
    console.log('Redis connection is ready');
});

// Helper type to extract method names of the Redis instance
type RedisMethod = keyof Cluster;
// type RedisMethodNames = {
//     [K in keyof Redis]: Redis[K] extends (...args: any[]) => any ? K : never;
// }[keyof Redis];

// Wrap Redis methods with performance logging
const wrapRedisMethod = (methodName: RedisMethod) => {
    const originalMethod = redis[methodName];
    if (typeof originalMethod === 'function') {
      (redis as any)[methodName] = function (this: Cluster, ...args: any[]) {
        const start = Date.now();
        const result = (originalMethod as Function).call(this, ...args);
        if (result instanceof Promise) {
          return result.finally(() => {
            console.log(`Redis ${methodName.toString()} took ${Date.now() - start}ms`);
          });
        }
        console.log(`Redis ${methodName.toString()} took ${Date.now() - start}ms`);
        return result;
      };
    }
};

// Wrap common Redis methods
(['get', 'set', 'lrange', 'lpush', 'rpush'] as const).forEach(method => {
    wrapRedisMethod(method);
});

redis.ping().then(() => {
    console.log('Successfully pinged Redis cluster');
}).catch((error) => {
    console.error('Failed to ping Redis cluster:', error);
});

export default redis;