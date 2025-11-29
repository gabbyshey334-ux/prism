const cron = require('node-cron');
const Queue = require('bull');
const trendResearchService = require('../services/trends/trendResearch');
const TrendingTopicModel = require('../models/TrendingTopic');
const logger = require('./logger');
const { redisConfig } = require('../config/redis');

// Initialize trend discovery queue
const trendQueue = new Queue('trend discovery', { redis: redisConfig });

/**
 * Process trend discovery job
 */
trendQueue.process('discover', 1, async (job) => {
  const { category, platform, limit, userId } = job.data;
  
  logger.info(`Processing trend discovery job - category: ${category}, platform: ${platform}`);
  
  try {
    job.progress(10);
    
    // Discover trends
    const discoveredTrends = await trendResearchService.discoverTrends({
      category,
      platform,
      limit: limit || 20
    });
    
    job.progress(50);
    
    // Score and save trends
    const savedTrends = [];
    for (let i = 0; i < discoveredTrends.length; i++) {
      const trend = discoveredTrends[i];
      
      try {
        // Score the trend
        const viralScore = await trendResearchService.scoreTrend(trend);
        
        // Calculate expiration (7 days from now)
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        
        // Save to database
        const saved = await TrendingTopicModel.create({
          user_id: userId || null, // null = global trend
          platform: trend.platform,
          topic: trend.topic,
          description: trend.description,
          hashtags: trend.keywords || [],
          viral_score: viralScore,
          relevance_score: 50, // Default, can be improved
          volume: trend.volume,
          source: trend.source,
          category: trend.category,
          expires_at: expiresAt.toISOString()
        });
        
        savedTrends.push(saved);
        
        job.progress(50 + ((i + 1) / discoveredTrends.length) * 40);
      } catch (saveError) {
        logger.warn(`Failed to save trend "${trend.topic}":`, saveError.message);
      }
    }
    
    job.progress(100);
    
    logger.info(`Successfully discovered and saved ${savedTrends.length} trends`);
    
    return {
      success: true,
      discovered: discoveredTrends.length,
      saved: savedTrends.length,
      trends: savedTrends
    };
  } catch (error) {
    logger.error('Trend discovery job failed:', error);
    throw error;
  }
});

/**
 * Process trend cleanup job
 */
trendQueue.process('cleanup', 1, async (job) => {
  logger.info('Processing trend cleanup job');
  
  try {
    const deletedCount = await TrendingTopicModel.cleanupExpired();
    
    logger.info(`Cleaned up ${deletedCount} expired trends`);
    
    return {
      success: true,
      deleted_count: deletedCount
    };
  } catch (error) {
    logger.error('Trend cleanup job failed:', error);
    throw error;
  }
});

// Queue event handlers
trendQueue.on('completed', (job, result) => {
  logger.info(`Trend discovery job ${job.id} completed:`, result);
});

trendQueue.on('failed', (job, error) => {
  logger.error(`Trend discovery job ${job.id} failed:`, error.message);
});

trendQueue.on('stalled', (job) => {
  logger.warn(`Trend discovery job ${job.id} stalled`);
});

/**
 * Schedule automatic trend discovery (every 6 hours)
 */
function scheduleTrendDiscovery() {
  // Run every 6 hours
  cron.schedule('0 */6 * * *', async () => {
    logger.info('Starting scheduled trend discovery...');
    
    try {
      // Discover trends for different categories
      const categories = ['technology', 'entertainment', 'business', 'lifestyle', 'news'];
      
      for (const category of categories) {
        try {
          await trendQueue.add('discover', {
            category,
            platform: null,
            limit: 10,
            userId: null // Global trends
          }, {
            attempts: 2,
            backoff: {
              type: 'exponential',
              delay: 5000
            }
          });
          
          logger.info(`Queued trend discovery for category: ${category}`);
        } catch (error) {
          logger.error(`Failed to queue discovery for ${category}:`, error.message);
        }
      }
    } catch (error) {
      logger.error('Scheduled trend discovery failed:', error);
    }
  });
  
  logger.info('Trend discovery scheduler started (runs every 6 hours)');
}

/**
 * Schedule trend cleanup (daily at 2 AM)
 */
function scheduleTrendCleanup() {
  cron.schedule('0 2 * * *', async () => {
    logger.info('Starting scheduled trend cleanup...');
    
    try {
      await trendQueue.add('cleanup', {}, {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 10000
        }
      });
    } catch (error) {
      logger.error('Scheduled trend cleanup failed:', error);
    }
  });
  
  logger.info('Trend cleanup scheduler started (runs daily at 2 AM)');
}

/**
 * Add trend discovery job to queue
 * @param {Object} params - Discovery parameters
 * @returns {Promise<Object>} Job data
 */
async function queueTrendDiscovery(params) {
  const job = await trendQueue.add('discover', {
    ...params,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 5000
    },
    removeOnComplete: true,
    removeOnFail: false
  });
  
  return {
    jobId: job.id,
    status: 'queued'
  };
}

/**
 * Get trend discovery job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
async function getTrendJobStatus(jobId) {
  const job = await trendQueue.getJob(jobId);
  
  if (!job) {
    return { status: 'not_found' };
  }
  
  const state = await job.getState();
  const progress = job.progress();
  
  return {
    jobId: job.id,
    status: state,
    progress,
    data: job.data,
    result: job.returnvalue,
    error: job.failedReason
  };
}

// Start schedulers
scheduleTrendDiscovery();
scheduleTrendCleanup();

module.exports = {
  trendQueue,
  queueTrendDiscovery,
  getTrendJobStatus,
  scheduleTrendDiscovery,
  scheduleTrendCleanup
};

