const { getPlatformService } = require('../services/platforms');
const PostModel = require('../models/Post');
const ContentModel = require('../models/Content');
const SocialMediaConnection = require('../models/SocialMediaConnection');
const { queuePost, getPostJobStatus } = require('../workers/postingWorker');
const logger = require('../workers/logger');

/**
 * Posting Controller
 * Handles social media posting operations
 */
class PostingController {
  /**
   * Create post (immediate or scheduled)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async createPost(req, res) {
    try {
      const {
        contentId,
        brandId,
        platform,
        platforms = [], // For batch posting
        scheduledFor = null,
        postData = {}
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      if (!contentId) {
        return res.status(400).json({
          error: 'content_id_required',
          message: 'contentId is required'
        });
      }

      // Get content
      const content = await ContentModel.getById(contentId);
      if (!content) {
        return res.status(404).json({
          error: 'content_not_found',
          message: 'Content not found'
        });
      }

      if (content.user_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to post this content'
        });
      }

      // Determine platforms to post to
      const targetPlatforms = platforms.length > 0 ? platforms : [platform];
      if (targetPlatforms.length === 0) {
        return res.status(400).json({
          error: 'platform_required',
          message: 'At least one platform is required'
        });
      }

      const results = [];

      // Create posts for each platform
      for (const targetPlatform of targetPlatforms) {
        try {
          // Get connection
          const connection = await SocialMediaConnection.getByUserAndPlatform(
            userId,
            targetPlatform,
            brandId
          );

          if (!connection || !connection.is_active) {
            results.push({
              platform: targetPlatform,
              success: false,
              error: `No active ${targetPlatform} connection found`
            });
            continue;
          }

          // Prepare post data
          const contentData = {
            text: content.text_content ? JSON.parse(content.text_content)?.caption : content.description,
            media: content.media_urls || [],
            hashtags: postData.hashtags || [],
            mentions: postData.mentions || []
          };

          // If scheduled, create post record and queue
          if (scheduledFor) {
            const post = await PostModel.create({
              content_id: contentId,
              brand_id: brandId,
              platform: targetPlatform,
              scheduled_for: scheduledFor,
              status: 'pending',
              post_data: postData
            });

            // Queue scheduled post
            await queuePost({
              postId: post.id,
              contentId,
              platform: targetPlatform,
              connectionId: connection.id,
              contentData,
              scheduledFor: new Date(scheduledFor)
            });

            results.push({
              platform: targetPlatform,
              success: true,
              postId: post.id,
              status: 'scheduled',
              scheduledFor
            });
          } else {
            // Immediate post
            const platformService = getPlatformService(targetPlatform);
            const postResult = await platformService.post(connection, contentData);

            // Create post record
            const post = await PostModel.create({
              content_id: contentId,
              brand_id: brandId,
              platform: targetPlatform,
              status: 'success',
              platform_post_id: postResult.postId,
              post_data: {
                url: postResult.url,
                engagement: postResult.metrics || {}
              }
            });

            // Update content status
            await ContentModel.updateStatus(contentId, 'posted');

            results.push({
              platform: targetPlatform,
              success: true,
              postId: post.id,
              platformPostId: postResult.postId,
              url: postResult.url,
              status: 'published'
            });
          }
        } catch (error) {
          logger.error(`Failed to create post for ${targetPlatform}:`, error);

          // Create failed post record
          try {
            const post = await PostModel.create({
              content_id: contentId,
              brand_id: brandId,
              platform: targetPlatform,
              status: 'failed',
              post_data: {},
              error_message: error.message
            });

            results.push({
              platform: targetPlatform,
              success: false,
              postId: post.id,
              error: error.message
            });
          } catch (createError) {
            results.push({
              platform: targetPlatform,
              success: false,
              error: error.message
            });
          }
        }
      }

      // Determine overall success
      const allSuccess = results.every(r => r.success);
      const someSuccess = results.some(r => r.success);

      res.status(allSuccess ? 200 : someSuccess ? 207 : 500).json({
        success: allSuccess,
        results,
        count: results.length,
        successful: results.filter(r => r.success).length,
        failed: results.filter(r => !r.success).length
      });
    } catch (error) {
      logger.error('Create post error:', error);
      res.status(500).json({
        error: 'post_creation_failed',
        message: error.message
      });
    }
  }

  /**
   * Schedule post
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async schedulePost(req, res) {
    try {
      const {
        contentId,
        brandId,
        platform,
        platforms = [],
        scheduledFor
      } = req.body;

      if (!scheduledFor) {
        return res.status(400).json({
          error: 'scheduled_for_required',
          message: 'scheduledFor is required'
        });
      }

      // Validate scheduled time is in future
      const scheduledDate = new Date(scheduledFor);
      if (scheduledDate <= new Date()) {
        return res.status(400).json({
          error: 'invalid_schedule_time',
          message: 'Scheduled time must be in the future'
        });
      }

      // Use createPost with scheduledFor
      req.body.scheduledFor = scheduledFor;
      return await this.createPost(req, res);
    } catch (error) {
      logger.error('Schedule post error:', error);
      res.status(500).json({
        error: 'post_scheduling_failed',
        message: error.message
      });
    }
  }

  /**
   * Publish post immediately
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async publishPost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      // Get post
      const post = await PostModel.getById(postId);
      if (!post) {
        return res.status(404).json({
          error: 'post_not_found',
          message: 'Post not found'
        });
      }

      // Get content
      const content = await ContentModel.getById(post.content_id);
      if (!content || content.user_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to publish this post'
        });
      }

      // Get connection
      const connection = await SocialMediaConnection.getById(post.connection_id || null);
      if (!connection) {
        // Try to get by user and platform
        const userConnection = await SocialMediaConnection.getByUserAndPlatform(
          userId,
          post.platform,
          content.brand_id
        );
        if (!userConnection) {
          return res.status(404).json({
            error: 'connection_not_found',
            message: `No active ${post.platform} connection found`
          });
        }
        connection = userConnection;
      }

      // Prepare content data
      const contentData = {
        text: content.text_content ? JSON.parse(content.text_content)?.caption : content.description,
        media: content.media_urls || []
      };

      // Post to platform
      const platformService = getPlatformService(post.platform);
      const postResult = await platformService.post(connection, contentData);

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
      await ContentModel.updateStatus(post.content_id, 'posted');

      res.json({
        success: true,
        post: {
          id: postId,
          platformPostId: postResult.postId,
          url: postResult.url,
          status: 'published',
          postedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Publish post error:', error);

      // Update post status to failed
      try {
        await PostModel.updateStatus(req.params.postId, 'failed', {
          error_message: error.message
        });
      } catch (updateError) {
        logger.error('Failed to update post status:', updateError);
      }

      res.status(500).json({
        error: 'post_publishing_failed',
        message: error.message
      });
    }
  }

  /**
   * Update post
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async updatePost(req, res) {
    try {
      const { postId } = req.params;
      const updates = req.body;
      const userId = req.user?.uid;

      // Get post
      const post = await PostModel.getById(postId);
      if (!post) {
        return res.status(404).json({
          error: 'post_not_found',
          message: 'Post not found'
        });
      }

      // Verify ownership
      const content = await ContentModel.getById(post.content_id);
      if (!content || content.user_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to update this post'
        });
      }

      // Only allow updates to pending posts
      if (post.status !== 'pending') {
        return res.status(400).json({
          error: 'post_already_published',
          message: 'Cannot update post that is not pending'
        });
      }

      // Update post
      const updated = await PostModel.update(postId, updates);

      res.json({
        success: true,
        post: updated
      });
    } catch (error) {
      logger.error('Update post error:', error);
      res.status(500).json({
        error: 'post_update_failed',
        message: error.message
      });
    }
  }

  /**
   * Delete post
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async deletePost(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.uid;

      // Get post
      const post = await PostModel.getById(postId);
      if (!post) {
        return res.status(404).json({
          error: 'post_not_found',
          message: 'Post not found'
        });
      }

      // Verify ownership
      const content = await ContentModel.getById(post.content_id);
      if (!content || content.user_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to delete this post'
        });
      }

      // If post is published, delete from platform
      if (post.status === 'success' && post.platform_post_id) {
        try {
          const connection = await SocialMediaConnection.getByUserAndPlatform(
            userId,
            post.platform,
            content.brand_id
          );

          if (connection) {
            const platformService = getPlatformService(post.platform);
            await platformService.deletePost(connection, post.platform_post_id);
          }
        } catch (deleteError) {
          logger.warn('Failed to delete post from platform:', deleteError.message);
          // Continue with database deletion even if platform deletion fails
        }
      }

      // Delete from database (or mark as deleted)
      // Note: post_history table doesn't have soft delete, so we'll update status
      await PostModel.updateStatus(postId, 'failed', {
        error_message: 'Post deleted by user'
      });

      res.json({
        success: true,
        message: 'Post deleted successfully'
      });
    } catch (error) {
      logger.error('Delete post error:', error);
      res.status(500).json({
        error: 'post_deletion_failed',
        message: error.message
      });
    }
  }

  /**
   * Get post status
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getPostStatus(req, res) {
    try {
      const { postId } = req.params;
      const userId = req.user?.uid;

      // Get post
      const post = await PostModel.getById(postId);
      if (!post) {
        return res.status(404).json({
          error: 'post_not_found',
          message: 'Post not found'
        });
      }

      // Verify ownership
      const content = await ContentModel.getById(post.content_id);
      if (!content || content.user_id !== userId) {
        return res.status(403).json({
          error: 'forbidden',
          message: 'You do not have permission to view this post'
        });
      }

      // If published, get latest status from platform
      if (post.status === 'success' && post.platform_post_id) {
        try {
          const connection = await SocialMediaConnection.getByUserAndPlatform(
            userId,
            post.platform,
            content.brand_id
          );

          if (connection) {
            const platformService = getPlatformService(post.platform);
            const platformStatus = await platformService.getPostStatus(connection, post.platform_post_id);

            // Update post with latest metrics
            await PostModel.update(postId, {
              engagement_data: {
                ...post.engagement_data,
                metrics: platformStatus.metrics || {}
              }
            });

            return res.json({
              success: true,
              post: {
                ...post,
                platformStatus,
                engagement_data: {
                  ...post.engagement_data,
                  metrics: platformStatus.metrics || {}
                }
              }
            });
          }
        } catch (statusError) {
          logger.warn('Failed to get platform status:', statusError.message);
          // Return database status if platform check fails
        }
      }

      res.json({
        success: true,
        post
      });
    } catch (error) {
      logger.error('Get post status error:', error);
      res.status(500).json({
        error: 'status_fetch_failed',
        message: error.message
      });
    }
  }

  /**
   * Get posting analytics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getAnalytics(req, res) {
    try {
      const userId = req.user?.uid;
      const { platform, brand_id, start_date, end_date } = req.query;

      const analytics = await postingAnalytics.getAnalytics({
        user_id: userId,
        platform,
        brand_id,
        start_date,
        end_date
      });

      res.json({
        success: true,
        analytics
      });
    } catch (error) {
      logger.error('Get analytics error:', error);
      res.status(500).json({
        error: 'analytics_fetch_failed',
        message: error.message
      });
    }
  }

  /**
   * Get best times to post
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getBestTimes(req, res) {
    try {
      const userId = req.user?.uid;
      const { platform } = req.query;

      if (!platform) {
        return res.status(400).json({
          error: 'platform_required',
          message: 'Platform is required'
        });
      }

      const bestTimes = await postingAnalytics.getBestTimes(platform, userId);

      res.json({
        success: true,
        platform,
        bestTimes
      });
    } catch (error) {
      logger.error('Get best times error:', error);
      res.status(500).json({
        error: 'best_times_fetch_failed',
        message: error.message
      });
    }
  }
}

module.exports = PostingController;

