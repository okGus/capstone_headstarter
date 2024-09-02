import assert from "assert";
import { Redis } from "ioredis";

assert(process.env.REDIS_URL !== undefined, 'REDIS_URL is undefined');
const redis = new Redis(process.env.REDIS_URL);

export default redis;