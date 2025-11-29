const AutolistSettings = require('../models/AutolistSettings');
const ContentModel = require('../models/Content');
const PostModel = require('../models/Post');
const { queuePost } = require('../workers/postingWorker');
const logger = require('../workers/logger');

/**
 * Autolist Service
 * Handles automatic posting loops
 */
class AutolistService {
  /**
   * Process autolist for a brand/platform
   * @param {string} brandId - Brand ID
   * @param {string} platform - Platform name
   * @returns {Promise<Object>} Processing result
   */
  async processAutolist(brandId, platform) {
    try {
      // Get autolist settings
      const settings = await AutolistSettings.getByBrandAndPlatform(brandId, platform);
      
      if (!settings || !settings.is_enabled) {
        return {
          success: false,
          message: 'Autolist not enabled for this brand/platform'
        };
      }

      // Get queued content
      const queueContentIds = settings.queue_content_ids || [];
      if (queueContentIds.length === 0) {
        return {
          success: false,
          message: 'No content in autolist queue'
        };
      }

      // Get next content to post
      const nextContentId = queueContentIds[0];
      const content = await ContentModel.getById(nextContentId);

      if (!content) {
        // Remove invalid content ID
        await this.removeFromQueue(brandId, platform, nextContentId);
        return {
          success: false,
          message: 'Content not found, removed from queue'
        };
      }

      // Check if content is ready (status should be completed_draft or scheduled)
      if (!['completed_draft', 'scheduled'].includes(content.status)) {
        return {
          success: false,
          message: `Content not ready (status: ${content.status})`
        };
      }

      // Calculate next post time
      const nextPostTime = this.calculateNextPostTime(settings);

      // Create post
      const post = await PostModel.create({
        content_id: nextContentId,
        brand_id: brandId,
        platform,
        status: 'pending',
        post_data: {}
      });

      // Queue post
      await queuePost({
        postId: post.id,
        contentId: nextContentId,
        platform,
        contentData: {
          text: content.text_content ? JSON.parse(content.text_content)?.caption : content.description,
          media: content.media_urls || []
        },
        scheduledFor: nextPostTime
      });

      // Remove from queue and add to end (loop)
      await this.rotateQueue(brandId, platform, nextContentId);

      return {
        success: true,
        postId: post.id,
        contentId: nextContentId,
        scheduledFor: nextPostTime,
        nextInQueue: queueContentIds.length > 1 ? queueContentIds[1] : null
      };
    } catch (error) {
      logger.error('Autolist processing error:', error);
      throw error;
    }
  }

  /**
   * Calculate next post time based on settings
   * @param {Object} settings - Autolist settings
   * @returns {Date} Next post time
   */
  calculateNextPostTime(settings) {
    const now = new Date();
    const postTimes = settings.post_times || [];
    const timezone = settings.timezone || 'UTC';

    if (postTimes.length === 0) {
      // Default: post in 1 hour
      return new Date(now.getTime() + 60 * 60 * 1000);
    }

    // Find next available time slot today
    for (const timeStr of postTimes) {
      const [hours, minutes] = timeStr.split(':').map(Number);
      const postTime = new Date(now);
      postTime.setHours(hours, minutes, 0, 0);

      if (postTime > now) {
        return postTime;
      }
    }

    // If no time today, use first time tomorrow
    const [hours, minutes] = postTimes[0].split(':').map(Number);
    const postTime = new Date(now);
    postTime.setDate(postTime.getDate() + 1);
    postTime.setHours(hours, minutes, 0, 0);

    return postTime;
  }

  /**
   * Rotate queue (move first item to end)
   * @param {string} brandId - Brand ID
   * @param {string} platform - Platform name
   * @param {string} contentId - Content ID to rotate
   */
  async rotateQueue(brandId, platform, contentId) {
    const settings = await AutolistSettings.getByBrandAndPlatform(brandId, platform);
    if (!settings) return;

    const queue = settings.queue_content_ids || [];
    const index = queue.indexOf(contentId);

    if (index !== -1) {
      queue.splice(index, 1);
      queue.push(contentId); // Add to end

      await AutolistSettings.update(settings.id, {
        queue_content_ids: queue
      });
    }
  }

  /**
   * Remove content from queue
   * @param {string} brandId - Brand ID
   * @param {string} platform - Platform name
   * @param {string} contentId - Content ID to remove
   */
  async removeFromQueue(brandId, platform, contentId) {
    const settings = await AutolistSettings.getByBrandAndPlatform(brandId, platform);
    if (!settings) return;

    const queue = settings.queue_content_ids || [];
    const filtered = queue.filter(id => id !== contentId);

    await AutolistSettings.update(settings.id, {
      queue_content_ids: filtered
    });
  }

  /**
   * Add content to queue
   * @param {string} brandId - Brand ID
   * @param {string} platform - Platform name
   * @param {string} contentId - Content ID to add
   */
  async addToQueue(brandId, platform, contentId) {
    const settings = await AutolistSettings.getByBrandAndPlatform(brandId, platform);
    
    if (!settings) {
      // Create settings if they don't exist
      await AutolistSettings.create({
        brand_id: brandId,
        platform,
        is_enabled: false,
        queue_content_ids: [contentId]
      });
      return;
    }

    const queue = settings.queue_content_ids || [];
    if (!queue.includes(contentId)) {
      queue.push(contentId);
      await AutolistSettings.update(settings.id, {
        queue_content_ids: queue
      });
    }
  }
}

module.exports = new AutolistService();


