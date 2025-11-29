const Queue = require('bull');
const ContentController = require('../controllers/ContentController');
const ContentModel = require('../models/Content');
const logger = require('./logger');
const { redisConfig } = require('../config/redis');

// Initialize content generation queue
const contentQueue = new Queue('content generation', { redis: redisConfig });

/**
 * Process text generation job
 */
contentQueue.process('generate-text', 3, async (job) => {
  const { contentId, topic, platform, contentType, brandContext, tone, audience, style, provider } = job.data;
  
  logger.info(`Processing text generation job for content ${contentId || 'new'}`);
  
  try {
    // Create a mock request object for the controller
    const mockReq = {
      body: {
        topic,
        platform,
        contentType,
        brandContext,
        tone,
        audience,
        style,
        provider,
        contentId
      },
      user: { uid: job.data.userId }
    };
    
    const mockRes = {
      json: (data) => {
        job.progress(100);
        return data;
      },
      status: (code) => ({
        json: (data) => {
          throw new Error(data.message || 'Generation failed');
        }
      })
    };

    await ContentController.generateText(mockReq, mockRes);
    
    logger.info(`Successfully generated text for content ${contentId || 'new'}`);
    return { success: true, contentId };
  } catch (error) {
    logger.error(`Text generation failed for content ${contentId}:`, error);
    
    // Update content status to failed if contentId exists
    if (contentId) {
      try {
        await ContentModel.updateStatus(contentId, 'failed');
        await ContentModel.updateMetadata(contentId, {
          error: error.message,
          failed_at: new Date().toISOString()
        });
      } catch (updateError) {
        logger.error('Failed to update content status:', updateError);
      }
    }
    
    throw error;
  }
});

/**
 * Process image generation job
 */
contentQueue.process('generate-image', 2, async (job) => {
  const { contentId, prompt, size, quality, style } = job.data;
  
  logger.info(`Processing image generation job for content ${contentId || 'new'}`);
  
  try {
    const mockReq = {
      body: {
        prompt,
        contentId,
        size,
        quality,
        style
      },
      user: { uid: job.data.userId }
    };
    
    const mockRes = {
      json: (data) => {
        job.progress(100);
        return data;
      },
      status: (code) => ({
        json: (data) => {
          throw new Error(data.message || 'Generation failed');
        }
      })
    };

    await ContentController.generateImage(mockReq, mockRes);
    
    logger.info(`Successfully generated image for content ${contentId || 'new'}`);
    return { success: true, contentId };
  } catch (error) {
    logger.error(`Image generation failed for content ${contentId}:`, error);
    
    if (contentId) {
      try {
        await ContentModel.updateStatus(contentId, 'failed');
        await ContentModel.updateMetadata(contentId, {
          error: error.message,
          failed_at: new Date().toISOString()
        });
      } catch (updateError) {
        logger.error('Failed to update content status:', updateError);
      }
    }
    
    throw error;
  }
});

/**
 * Process brainstorm job
 */
contentQueue.process('brainstorm', 5, async (job) => {
  const { topic, brandContext, platform, count, provider } = job.data;
  
  logger.info(`Processing brainstorm job for topic: ${topic}`);
  
  try {
    const mockReq = {
      body: {
        topic,
        brandContext,
        platform,
        count,
        provider
      },
      user: { uid: job.data.userId }
    };
    
    const mockRes = {
      json: (data) => {
        job.progress(100);
        return data;
      },
      status: (code) => ({
        json: (data) => {
          throw new Error(data.message || 'Brainstorm failed');
        }
      })
    };

    const result = await ContentController.brainstormIdeas(mockReq, mockRes);
    
    logger.info(`Successfully brainstormed ${result.ideas?.length || 0} ideas`);
    return result;
  } catch (error) {
    logger.error('Brainstorm failed:', error);
    throw error;
  }
});

// Queue event handlers
contentQueue.on('completed', (job, result) => {
  logger.info(`Content generation job ${job.id} completed`);
});

contentQueue.on('failed', (job, error) => {
  logger.error(`Content generation job ${job.id} failed:`, error.message);
});

contentQueue.on('stalled', (job) => {
  logger.warn(`Content generation job ${job.id} stalled`);
});

/**
 * Add text generation job to queue
 * @param {Object} params - Job parameters
 * @returns {Promise<Object>} Job data
 */
async function queueTextGeneration(params) {
  const job = await contentQueue.add('generate-text', {
    ...params,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 2000
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
 * Add image generation job to queue
 * @param {Object} params - Job parameters
 * @returns {Promise<Object>} Job data
 */
async function queueImageGeneration(params) {
  const job = await contentQueue.add('generate-image', {
    ...params,
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 3000
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
 * Add brainstorm job to queue
 * @param {Object} params - Job parameters
 * @returns {Promise<Object>} Job data
 */
async function queueBrainstorm(params) {
  const job = await contentQueue.add('brainstorm', {
    ...params,
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 2000
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
 * Get job status
 * @param {string} jobId - Job ID
 * @returns {Promise<Object>} Job status
 */
async function getJobStatus(jobId) {
  const job = await contentQueue.getJob(jobId);
  
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

module.exports = {
  contentQueue,
  queueTextGeneration,
  queueImageGeneration,
  queueBrainstorm,
  getJobStatus
};

