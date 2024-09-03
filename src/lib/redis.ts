import assert from "assert";
import { Cluster, ClusterOptions, Redis } from "ioredis";
import fs from "fs";
import path from "path";
import tls from "tls";

assert(process.env.REDIS_URL !== undefined, 'REDIS_URL is undefined');

const caCertPath = path.join(process.cwd(), 'AmazonRootCA1.pem');
console.log('CA Certificate Path:', caCertPath);
console.log('CA Certificate exists:', fs.existsSync(caCertPath));

const redisOptions: ClusterOptions = {
    redisOptions: {
        tls: {
            ca: fs.readFileSync(caCertPath),
            rejectUnauthorized: true,
            checkServerIdentity: (host, cert) => {
                console.log('TLS Handshake - Host:', host);
                console.log('TLS Handshake - Certificate Subject:', cert.subject);
                console.log('TLS Handshake - Certificate Issuer:', cert.issuer);
                return tls.checkServerIdentity(host, cert);
            },
        },
        connectTimeout: 20000,
        maxRetriesPerRequest: 3,
    },
    clusterRetryStrategy: (times) => {
        const delay = Math.min(times * 50, 2000);
        console.log(`Retrying Redis connection, attemp ${times}`);
        return delay;
    },
};

console.log('Connecting to Redis URL:', process.env.REDIS_URL);

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
    if (error.code) {
        console.error('Error code:', error.code);
    }
    console.error('Error stack:', error.stack);
});

redis.on('connect', () => {
    console.log('Successfully connected to Redis cluster');
});

redis.on('ready', () => {
    console.log('Redis connection is ready');
});

redis.on('node error', (error,  node) => {
    console.error('Redis node error:');
    console.error('Error:', error);
    if (error.code) {
        console.error('Error code:', error.code);
    }
    console.error('Error stack:', error.stack);
    if (node) {
        console.error(`Node: ${node.options?.host}:${node.options?.port}`);
    } else {
        console.error('Node information not available');
    }
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