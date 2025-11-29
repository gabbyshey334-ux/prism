const { getRedisClient } = require('../../config/redis');

/**
 * Rate Limiter Service
 * Handles API rate limiting with Redis for AI services
 */
class RateLimiterService {
  constructor() {
    this.redisClient = null;
    this.limits = {
      openai: {
        requests: 60, // requests per window
        window: 60 * 1000, // 1 minute in milliseconds
        retryAfter: 60 // seconds to wait
      },
      anthropic: {
        requests: 50,
        window: 60 * 1000,
        retryAfter: 60
      },
      image: {
        requests: 10,
        window: 60 * 1000,
        retryAfter: 60
      }
    };
  }

  /**
   * Get Redis client
   * @returns {Object} Redis client
   */
  async getRedis() {
    if (!this.redisClient) {
      this.redisClient = getRedisClient();
    }
    return this.redisClient;
  }

  /**
   * Check if request is within rate limit
   * @param {string} service - Service name (openai, anthropic, image)
   * @param {string} userId - User ID for per-user limiting
   * @returns {Promise<Object>} Rate limit status
   */
  async checkRateLimit(service, userId = 'global') {
    try {
      const redis = await this.getRedis();
      const limit = this.limits[service] || this.limits.openai;
      const key = `rate_limit:${service}:${userId}`;
      const windowKey = `${key}:window`;

      // Get current count
      const count = await redis.get(key);
      const currentCount = count ? parseInt(count) : 0;

      // Check if window exists
      const windowExists = await redis.exists(windowKey);

      if (!windowExists) {
        // Start new window
        await redis.setEx(windowKey, Math.ceil(limit.window / 1000), '1');
        await redis.setEx(key, Math.ceil(limit.window / 1000), '1');
        return {
          allowed: true,
          remaining: limit.requests - 1,
          resetAt: Date.now() + limit.window
        };
      }

      if (currentCount >= limit.requests) {
        // Rate limit exceeded
        const ttl = await redis.ttl(windowKey);
        return {
          allowed: false,
          remaining: 0,
          resetAt: Date.now() + (ttl * 1000),
          retryAfter: limit.retryAfter
        };
      }

      // Increment counter
      await redis.incr(key);
      await redis.expire(key, Math.ceil(limit.window / 1000));

      return {
        allowed: true,
        remaining: limit.requests - currentCount - 1,
        resetAt: Date.now() + (await redis.ttl(windowKey) * 1000)
      };
    } catch (error) {
      // If Redis fails, allow request (fail open)
      console.error('Rate limiter error:', error);
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: null,
        error: 'Rate limiter unavailable'
      };
    }
  }

  /**
   * Reset rate limit for a user
   * @param {string} service - Service name
   * @param {string} userId - User ID
   */
  async resetRateLimit(service, userId = 'global') {
    try {
      const redis = await this.getRedis();
      const key = `rate_limit:${service}:${userId}`;
      const windowKey = `${key}:window`;
      
      await redis.del(key);
      await redis.del(windowKey);
    } catch (error) {
      console.error('Failed to reset rate limit:', error);
    }
  }

  /**
   * Get rate limit info
   * @param {string} service - Service name
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Rate limit info
   */
  async getRateLimitInfo(service, userId = 'global') {
    try {
      const redis = await this.getRedis();
      const limit = this.limits[service] || this.limits.openai;
      const key = `rate_limit:${service}:${userId}`;
      const windowKey = `${key}:window`;

      const count = await redis.get(key);
      const currentCount = count ? parseInt(count) : 0;
      const ttl = await redis.ttl(windowKey);

      return {
        service,
        limit: limit.requests,
        current: currentCount,
        remaining: Math.max(0, limit.requests - currentCount),
        resetAt: ttl > 0 ? Date.now() + (ttl * 1000) : null,
        window: limit.window
      };
    } catch (error) {
      console.error('Failed to get rate limit info:', error);
      return {
        service,
        limit: this.limits[service]?.requests || 60,
        current: 0,
        remaining: Infinity,
        resetAt: null,
        error: 'Rate limiter unavailable'
      };
    }
  }
}

module.exports = new RateLimiterService();

