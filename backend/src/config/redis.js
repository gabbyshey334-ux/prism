const Redis = require('redis');
const logger = require('../workers/logger');

// Redis configuration
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
  socket: {
    reconnectStrategy: (retries) => {
      if (retries > 10) {
        logger.error('Redis: Max reconnection attempts reached');
        return new Error('Redis connection failed');
      }
      return Math.min(retries * 50, 1000);
    }
  }
};

// Create Redis client
let redisClient = null;

function getRedisClient() {
  if (!redisClient) {
    // Redis v4+ uses different API
    const clientConfig = {
      socket: {
        host: redisConfig.host,
        port: redisConfig.port,
        reconnectStrategy: redisConfig.socket?.reconnectStrategy || ((retries) => {
          if (retries > 10) {
            logger.error('Redis: Max reconnection attempts reached');
            return new Error('Redis connection failed');
          }
          return Math.min(retries * 50, 1000);
        })
      }
    };
    
    if (redisConfig.password) {
      clientConfig.password = redisConfig.password;
    }
    
    if (redisConfig.db) {
      clientConfig.database = redisConfig.db;
    }
    
    redisClient = Redis.createClient(clientConfig);
    
    const logger = require('../workers/logger');
    
    redisClient.on('error', (err) => {
      logger.error('Redis Client Error', { error: err.message });
    });
    
    redisClient.on('connect', () => {
      logger.info('Redis client connecting...');
    });
    
    redisClient.on('ready', () => {
      logger.info('Redis client ready');
    });
    
    redisClient.on('reconnecting', () => {
      logger.info('Redis client reconnecting...');
    });
    
    // Connect to Redis
    redisClient.connect().catch((err) => {
      logger.error('Redis connection error', { error: err.message });
    });
  }
  
  return redisClient;
}

// Graceful shutdown
process.on('SIGINT', async () => {
  if (redisClient) {
    await redisClient.quit();
    logger.info('Redis client disconnected');
  }
});

module.exports = {
  getRedisClient,
  redisConfig
};

