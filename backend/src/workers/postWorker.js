const Queue = require('bull');
const cron = require('node-cron');
const { supabaseAdmin } = require('../config/supabase');
const { publishPost } = require('./postPublisher');
const logger = require('./logger');
const Redis = require('redis');

// Redis connection for job queues
const redisConfig = {
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  db: process.env.REDIS_DB || 0,
  retryDelayOnFailover: 100,
  maxRetriesPerRequest: 3,
};

// Initialize job queues
const postQueue = new Queue('post publishing', { redis: redisConfig });
const recurringQueue = new Queue('recurring posts', { redis: redisConfig });
const retryQueue = new Queue('retry posts', { redis: redisConfig });

// Queue processors
postQueue.process('publish', 5, async (job) => { // 5 concurrent jobs
  const { postId } = job.data;
  logger.info(`Processing post ${postId}`);
  
  try {
    await publishPost(postId);
    logger.info(`Successfully published post ${postId}`);
    
    // Log successful publication
    await logPostEvent(postId, 'posted', 'Post published successfully');
    
  } catch (error) {
    logger.error(`Failed to publish post ${postId}:`, error);
    
    // Log failure and schedule retry if needed
    await logPostEvent(postId, 'failed', error.message, {
      error: error.message,
      stack: error.stack
    });
    
    // Re-throw to trigger Bull's retry mechanism
    throw error;
  }
});

retryQueue.process('retry', 3, async (job) => {
  const { postId, attempt } = job.data;
  logger.info(`Processing retry attempt ${attempt} for post ${postId}`);
  
  try {
    await publishPost(postId);
    logger.info(`Successfully retried post ${postId}`);
    
    await logPostEvent(postId, 'retry_success', `Post published on retry attempt ${attempt}`);
    
  } catch (error) {
    logger.error(`Retry attempt ${attempt} failed for post ${postId}:`, error);
    
    await logPostEvent(postId, 'retry_failed', `Retry attempt ${attempt} failed: ${error.message}`, {
      error: error.message,
      attempt: attempt
    });
    
    throw error;
  }
});

recurringQueue.process('generate', 2, async (job) => {
  const { recurringPostId } = job.data;
  logger.info(`Generating recurring post instance ${recurringPostId}`);
  
  try {
    await generateRecurringPostInstance(recurringPostId);
    logger.info(`Successfully generated recurring post ${recurringPostId}`);
    
  } catch (error) {
    logger.error(`Failed to generate recurring post ${recurringPostId}:`, error);
    throw error;
  }
});

// Job event handlers
postQueue.on('completed', (job) => {
  logger.info(`Job ${job.id} completed successfully`);
});

postQueue.on('failed', (job, err) => {
  logger.error(`Job ${job.id} failed:`, err);
});

// Helper function to log post events
async function logPostEvent(postId, eventType, message, metadata = {}) {
  try {
    await supabaseAdmin.from('post_logs').insert({
      post_id: postId,
      event_type: eventType,
      status: eventType,
      message,
      metadata: {
        ...metadata,
        timestamp: new Date().toISOString(),
        worker_id: process.pid
      }
    });
  } catch (error) {
    logger.error('Failed to log post event:', error);
  }
}

// Function to add a post to the publishing queue
async function queuePostForPublishing(postId, delay = 0) {
  try {
    const job = await postQueue.add('publish', { postId }, {
      delay,
      attempts: 1, // We handle retries separately
      backoff: false,
      removeOnComplete: true,
      removeOnFail: false
    });
    
    logger.info(`Queued post ${postId} for publishing with job ${job.id}`);
    
    // Log queuing event
    await logPostEvent(postId, 'queued', `Post queued for publishing with delay ${delay}ms`);
    
    return job;
  } catch (error) {
    logger.error(`Failed to queue post ${postId}:`, error);
    throw error;
  }
}

// Function to schedule a retry with exponential backoff
async function scheduleRetry(postId, attempt = 1) {
  try {
    // Calculate exponential backoff delay (15min * 2^attempt with jitter)
    const baseDelay = 15 * 60 * 1000; // 15 minutes
    const maxDelay = 24 * 60 * 60 * 1000; // 24 hours
    const jitter = Math.random() * 0.1; // 10% jitter
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1) * (1 + jitter), maxDelay);
    
    const job = await retryQueue.add('retry', { postId, attempt }, {
      delay,
      attempts: 1,
      removeOnComplete: true,
      removeOnFail: false
    });
    
    logger.info(`Scheduled retry attempt ${attempt} for post ${postId} in ${Math.round(delay / 1000)}s`);
    
    // Update post with next retry time
    const nextRetryAt = new Date(Date.now() + delay);
    await supabaseAdmin
      .from('posts')
      .update({ next_retry_at: nextRetryAt })
      .eq('id', postId);
    
    // Log retry scheduling
    await logPostEvent(postId, 'retry_scheduled', `Retry attempt ${attempt} scheduled for ${nextRetryAt.toISOString()}`, {
      attempt,
      delay: delay,
      next_retry_at: nextRetryAt.toISOString()
    });
    
    return job;
  } catch (error) {
    logger.error(`Failed to schedule retry for post ${postId}:`, error);
    throw error;
  }
}

// Function to generate recurring post instances
async function generateRecurringPostInstance(recurringPostId) {
  try {
    // Get recurring post details
    const { data: recurringPost, error } = await supabaseAdmin
      .from('recurring_posts')
      .select('*')
      .eq('id', recurringPostId)
      .single();
    
    if (error || !recurringPost) {
      throw new Error(`Recurring post ${recurringPostId} not found`);
    }
    
    if (!recurringPost.is_active) {
      logger.info(`Recurring post ${recurringPostId} is inactive, skipping`);
      return;
    }
    
    // Calculate next run time based on recurrence rule
    const nextRunAt = calculateNextRun(recurringPost.recurrence_rule, recurringPost.last_generated_at);
    
    if (!nextRunAt) {
      logger.info(`No more runs for recurring post ${recurringPostId}`);
      return;
    }
    
    // Check if we've reached the end date
    if (recurringPost.end_at && nextRunAt > new Date(recurringPost.end_at)) {
      logger.info(`Recurring post ${recurringPostId} has reached end date`);
      
      // Deactivate the recurring post
      await supabaseAdmin
        .from('recurring_posts')
        .update({ is_active: false })
        .eq('id', recurringPostId);
      
      return;
    }
    
    // Create a new post instance
    const { data: newPost, error: createError } = await supabaseAdmin
      .from('posts')
      .insert({
        brand_id: recurringPost.brand_id,
        scheduled_at: nextRunAt.toISOString(),
        status: 'queued',
        is_recurring: true,
        parent_post_id: recurringPost.id // Link to recurring post template
        // Add other fields from recurring post template here
      })
      .select('*')
      .single();
    
    if (createError) {
      throw new Error(`Failed to create post instance: ${createError.message}`);
    }
    
    // Create recurring instance record
    await supabaseAdmin.from('recurring_post_instances').insert({
      recurring_post_id: recurringPostId,
      post_id: newPost.id,
      scheduled_for: nextRunAt.toISOString()
    });
    
    // Update recurring post with last generated time
    await supabaseAdmin
      .from('recurring_posts')
      .update({
        last_generated_at: new Date().toISOString(),
        next_generation_at: calculateNextRun(recurringPost.recurrence_rule, nextRunAt)?.toISOString()
      })
      .eq('id', recurringPostId);
    
    // Queue the new post for publishing
    await queuePostForPublishing(newPost.id);
    
    logger.info(`Generated recurring post instance ${newPost.id} for ${nextRunAt.toISOString()}`);
    
  } catch (error) {
    logger.error(`Failed to generate recurring post ${recurringPostId}:`, error);
    throw error;
  }
}

// Function to calculate next run time based on recurrence rule
function calculateNextRun(recurrenceRule, lastRun) {
  try {
    const cronParser = require('cron-parser');
    const interval = cronParser.parseExpression(recurrenceRule, {
      currentDate: lastRun || new Date()
    });
    
    return interval.next().toDate();
  } catch (error) {
    logger.error('Failed to parse recurrence rule:', error);
    return null;
  }
}

// Background scheduler - runs every minute to check for due posts
function startBackgroundScheduler() {
  logger.info('Starting background scheduler');
  
  // Check for due posts every minute
  cron.schedule('* * * * *', async () => {
    logger.debug('Running background scheduler check');
    await processDuePosts();
  });
  
  // Check for retry posts every 5 minutes
  cron.schedule('*/5 * * * *', async () => {
    logger.debug('Running retry scheduler check');
    await processRetryPosts();
  });
  
  // Generate recurring posts every hour
  cron.schedule('0 * * * *', async () => {
    logger.debug('Running recurring post generator');
    await generateRecurringPosts();
  });
  
  // Process due posts immediately on startup
  setTimeout(async () => {
    await processDuePosts();
    await processRetryPosts();
    await generateRecurringPosts();
  }, 5000); // Start after 5 seconds
}

// Process posts that are due for publishing
async function processDuePosts() {
  try {
    const now = new Date().toISOString();
    
    // Get posts that are queued and scheduled for now or earlier
    const { data: duePosts, error } = await supabaseAdmin
      .from('posts')
      .select('id, brand_id, platform')
      .eq('status', 'queued')
      .lte('scheduled_at', now)
      .is('processing_lock', null)
      .limit(50); // Process max 50 posts at a time
    
    if (error) {
      logger.error('Failed to fetch due posts:', error);
      return;
    }
    
    if (duePosts.length === 0) {
      logger.debug('No due posts to process');
      return;
    }
    
    logger.info(`Processing ${duePosts.length} due posts`);
    
    for (const post of duePosts) {
      try {
        // Acquire distributed lock
        const lockId = crypto.randomUUID();
        const { error: lockError } = await supabaseAdmin
          .from('posts')
          .update({ processing_lock: lockId, processing_started_at: new Date().toISOString() })
          .eq('id', post.id)
          .is('processing_lock', null);
        
        if (lockError) {
          logger.warn(`Failed to acquire lock for post ${post.id}:`, lockError);
          continue;
        }
        
        // Check if we got the lock
        const { data: lockedPost } = await supabaseAdmin
          .from('posts')
          .select('processing_lock')
          .eq('id', post.id)
          .single();
        
        if (lockedPost?.processing_lock !== lockId) {
          logger.debug(`Post ${post.id} is being processed by another worker`);
          continue;
        }
        
        // Queue the post for publishing
        await queuePostForPublishing(post.id);
        
      } catch (error) {
        logger.error(`Failed to process due post ${post.id}:`, error);
      }
    }
    
  } catch (error) {
    logger.error('Failed to process due posts:', error);
  }
}

// Process posts that are due for retry
async function processRetryPosts() {
  try {
    const now = new Date().toISOString();
    
    // Get posts that are in retry status and next_retry_at is due
    const { data: retryPosts, error } = await supabaseAdmin
      .from('posts')
      .select('id, retry_count')
      .eq('status', 'retry')
      .lte('next_retry_at', now)
      .is('processing_lock', null)
      .limit(25); // Process max 25 retries at a time
    
    if (error) {
      logger.error('Failed to fetch retry posts:', error);
      return;
    }
    
    if (retryPosts.length === 0) {
      logger.debug('No retry posts to process');
      return;
    }
    
    logger.info(`Processing ${retryPosts.length} retry posts`);
    
    for (const post of retryPosts) {
      try {
        // Reset status to pending for retry
        await supabaseAdmin
          .from('posts')
          .update({ 
            status: 'pending',
            next_retry_at: null,
            processing_lock: null 
          })
          .eq('id', post.id);
        
        // Queue for immediate publishing
        await queuePostForPublishing(post.id);
        
      } catch (error) {
        logger.error(`Failed to process retry post ${post.id}:`, error);
      }
    }
    
  } catch (error) {
    logger.error('Failed to process retry posts:', error);
  }
}

// Generate recurring posts
async function generateRecurringPosts() {
  try {
    const now = new Date().toISOString();
    
    // Get active recurring posts that are due for generation
    const { data: recurringPosts, error } = await supabaseAdmin
      .from('recurring_posts')
      .select('*')
      .eq('is_active', true)
      .or(`next_generation_at.lte.${now},last_generated_at.is.null`)
      .limit(10);
    
    if (error) {
      logger.error('Failed to fetch recurring posts:', error);
      return;
    }
    
    if (recurringPosts.length === 0) {
      logger.debug('No recurring posts to generate');
      return;
    }
    
    logger.info(`Generating ${recurringPosts.length} recurring posts`);
    
    for (const recurringPost of recurringPosts) {
      try {
        await generateRecurringPostInstance(recurringPost.id);
      } catch (error) {
        logger.error(`Failed to generate recurring post ${recurringPost.id}:`, error);
      }
    }
    
  } catch (error) {
    logger.error('Failed to generate recurring posts:', error);
  }
}

// Graceful shutdown
async function shutdown() {
  logger.info('Shutting down workers...');
  
  try {
    await postQueue.close();
    await retryQueue.close();
    await recurringQueue.close();
    
    logger.info('Workers shut down successfully');
  } catch (error) {
    logger.error('Error during shutdown:', error);
  }
}

module.exports = {
  startBackgroundScheduler,
  queuePostForPublishing,
  scheduleRetry,
  processDuePosts,
  processRetryPosts,
  generateRecurringPosts,
  shutdown,
  postQueue,
  retryQueue,
  recurringQueue
};