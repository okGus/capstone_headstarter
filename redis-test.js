const Redis = require('ioredis');

console.log('Starting Redis Cluster connection test...');

const redis = new Redis.Cluster(
  [
    {
      host: 'clustercfg.notificationredis.x44a67.use1.cache.amazonaws.com',
      port: 6379
    }
  ],
  {
    redisOptions: {
      tls: {
        // If you're using a self-signed certificate, you might need to disable reject unauthorized
        rejectUnauthorized: false
      },
      connectTimeout: 20000
    },
    clusterRetryStrategy: (times) => Math.min(times * 100, 3000)
  }
);

redis.on('connect', () => {
  console.log('Connected to Redis Cluster');
});

redis.on('error', (error) => {
  console.error('Redis Cluster connection error:', error);
});

// Test basic operations
redis.set('testKey', 'testValue', (err, result) => {
  if (err) {
    console.error('Error setting key:', err);
  } else {
    console.log('Successfully set key:', result);
    
    redis.get('testKey', (err, result) => {
      if (err) {
        console.error('Error getting key:', err);
      } else {
        console.log('Successfully retrieved key:', result);
      }
      
      // Close the connection
      redis.quit();
    });
  }
});

setTimeout(() => {
  console.log('Exiting script');
  process.exit(0);
}, 30000);