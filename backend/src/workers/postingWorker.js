const Queue = require('bull');
const cron = require('node-cron');
const { getPlatformService } = require('../services/platforms');
const PostModel = require('../models/Post');
const ContentModel = require('../models/Content');
const SocialMediaConnection = require('../models/SocialMediaConnection');
const logger = require('./logger');
const { redisConfig } = require('../config/redis');

// Initialize posting queue
const postingQueue = new Queue('post publishing', { redis: redisConfig });

/**
 * Process scheduled post job
 */
postingQueue.process('publish', 5, async (job) => {
  const { postId, contentId, platform, connectionId, contentData, scheduledFor } = job.data;
  
  logger.info(`Processing post ${postId} for platform ${platform}`);
  
  try {
    job.progress(10);
    
    // Get post
    const post = await PostModel.getById(postId);
    if (!post) {
      throw new Error(`Post ${postId} not found`);
    }

    // Get content
    const content = await ContentModel.getById(contentId || post.content_id);
    if (!content) {
      throw new Error(`Content ${contentId || post.content_id} not found`);
    }

    job.progress(30);

    // Get connection
    let connection;
    if (connectionId) {
      connection = await SocialMediaConnection.getById(connectionId);
    } else {
      connection = await SocialMediaConnection.getByUserAndPlatform(
        content.user_id,
        platform || post.platform,
        content.brand_id
      );
    }

    if (!connection || !connection.is_active) {
      throw new Error(`No active ${platform || post.platform} connection found`);
    }

    job.progress(50);

    // Prepare content data
    const postContent = contentData || {
      text: content.text_content ? JSON.parse(content.text_content)?.caption : content.description,
      media: content.media_urls || [],
      hashtags: [],
      mentions: []
    };

    job.progress(70);

    // Post to platform
    const platformService = getPlatformService(platform || post.platform);
    const postResult = await platformService.post(connection, postContent);

    job.progress(90);

    // Update post
    await PostModel.updateStatus(postId, 'success', {
      platform_post_id: postResult.postId,
      posted_at: new Date().toISOString(),
      engagement_data: {
        url: postResult.url,
        metrics: postResult.metrics || {}
      }
    });

    // Update content status
    await ContentModel.updateStatus(contentId || post.content_id, 'posted');

    job.progress(100);

    logger.info(`Successfully published post ${postId} to ${platform || post.platform}`);
    
    return {
      success: true,
      postId,
      platformPostId: postResult.postId,
      url: postResult.url
    };
  } catch (error) {
    logger.error(`Failed to publish post ${postId}:`, error);
    
    // Update post status to failed
    try {
      await PostModel.updateStatus(postId, 'failed', {
        error_message: error.message
      });
    } catch (updateError) {
      logger.error('Failed to update post status:', updateError);
    }
    
    throw error;
  }
});

// Queue event handlers
postingQueue.on('completed', (job, result) => {
  logger.info(`Post publishing job ${job.id} completed:`, result);
});

postingQueue.on('failed', (job, error) => {
  logger.error(`Post publishing job ${job.id} failed:`, error.message);
  
  // Schedule retry if attempts < max
  if (job.attemptsMade < (job.opts.attempts || 3)) {
    const delay = Math.min(1000 * 60 * Math.pow(2, job.attemptsMade), 1000 * 60 * 60); // Exponential backoff, max 1 hour
    postingQueue.add('publish', job.data, {
      delay,
      attempts: job.opts.attempts || 3,
      backoff: {
        type: 'exponential',
        delay: 1000 * 60 * 5 // Start with 5 minutes
      }
    });
  }
});

postingQueue.on('stalled', (job) => {
  logger.warn(`Post publishing job ${job.id} stalled`);
});

/**
 * Queue post for publishing
 * @param {Object} params - Post parameters
 * @returns {Promise<Object>} Job data
 */
async function queuePost(params) {
  const { scheduledFor, postId } = params;
  
  const delay = scheduledFor ? Math.max(0, new Date(scheduledFor).getTime() - Date.now()) : 0;
  
  const job = await postingQueue.add('publish', params, {
    delay,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000 * 60 * 5 // 5 minutes
    },
    removeOnComplete: true,
    removeOnFail: false
  });
  
  return {
    jobId: job.id,
    postId,
    status: 'queued',
    scheduledFor: scheduledFor || null
  };
}

/**
 * Get post job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
async function getPostJobStatus(jobId) {
  const job = await postingQueue.getJob(jobId);
  
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
    error: job.failedReason,
    attemptsMade: job.attemptsMade
  };
}

/**
 * Cancel scheduled post
 * @param {string} jobId - Job ID
 * @returns {Promise<boolean>} Success
 */
async function cancelPost(jobId) {
  const job = await postingQueue.getJob(jobId);
  
  if (!job) {
    return false;
  }
  
  await job.remove();
  return true;
}

/**
 * Get queue status
 * @returns {Promise<Object>} Queue status
 */
async function getQueueStatus() {
  const [waiting, active, completed, failed, delayed] = await Promise.all([
    postingQueue.getWaitingCount(),
    postingQueue.getActiveCount(),
    postingQueue.getCompletedCount(),
    postingQueue.getFailedCount(),
    postingQueue.getDelayedCount()
  ]);
  
  return {
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + delayed
  };
}

/**
 * Process scheduled posts (runs every minute)
 */
function startScheduledPostProcessor() {
  cron.schedule('* * * * *', async () => {
    try {
      // Get posts scheduled for now or earlier
      const scheduledPosts = await PostModel.getPosts({
        status: 'pending',
        limit: 50
      });

      const now = new Date();
      
      for (const post of scheduledPosts) {
        // Check if post is due (assuming scheduled_for is stored in metadata or separate field)
        // For now, we'll rely on Bull queue delays
        // This is a fallback for posts that might have been missed
      }
    } catch (error) {
      logger.error('Scheduled post processor error:', error);
    }
  });
  
  logger.info('Scheduled post processor started');
}

// Start processor
startScheduledPostProcessor();

module.exports = {
  postingQueue,
  queuePost,
  getPostJobStatus,
  cancelPost,
  getQueueStatus
};


