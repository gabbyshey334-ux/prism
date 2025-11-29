const router = require('express').Router();
const PostModel = require('../models/Post');
const postingAnalytics = require('../services/postingAnalytics');
const logger = require('../workers/logger');

/**
 * Webhook handlers for platform status updates
 * Note: Most platforms don't provide webhooks, but this structure supports them
 */

/**
 * POST /api/webhooks/instagram
 * Instagram webhook handler
 */
router.post('/instagram', async (req, res) => {
  try {
    const { object, entry } = req.body;

    // Instagram webhook verification
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
      if (req.query['hub.verify_token'] === process.env.INSTAGRAM_WEBHOOK_VERIFY_TOKEN) {
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Forbidden');
    }

    // Process webhook events
    if (object === 'instagram') {
      for (const event of entry || []) {
        // Handle different event types
        if (event.messaging) {
          // Handle messaging events
        }
        if (event.changes) {
          // Handle post status changes
          for (const change of event.changes) {
            if (change.field === 'comments') {
              // Comment added
              await handleCommentUpdate(change.value);
            }
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Instagram webhook error:', error);
    res.status(500).json({ error: 'webhook_processing_failed' });
  }
});

/**
 * POST /api/webhooks/facebook
 * Facebook webhook handler
 */
router.post('/facebook', async (req, res) => {
  try {
    // Facebook webhook verification
    if (req.query['hub.mode'] === 'subscribe' && req.query['hub.verify_token']) {
      if (req.query['hub.verify_token'] === process.env.FACEBOOK_WEBHOOK_VERIFY_TOKEN) {
        return res.status(200).send(req.query['hub.challenge']);
      }
      return res.status(403).send('Forbidden');
    }

    const { entry } = req.body;

    for (const event of entry || []) {
      if (event.messaging) {
        // Handle messaging events
      }
      if (event.changes) {
        // Handle post changes
        for (const change of event.changes) {
          if (change.field === 'feed') {
            // Post engagement update
            await handleEngagementUpdate(change.value);
          }
        }
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    logger.error('Facebook webhook error:', error);
    res.status(500).json({ error: 'webhook_processing_failed' });
  }
});

/**
 * Handle comment update
 * @param {Object} commentData - Comment data
 */
async function handleCommentUpdate(commentData) {
  try {
    // Find post by platform_post_id
    const posts = await PostModel.getPosts({
      platform_post_id: commentData.media_id,
      limit: 1
    });

    if (posts.length > 0) {
      const post = posts[0];
      const engagementData = post.engagement_data || {};
      
      await PostModel.update(post.id, {
        engagement_data: {
          ...engagementData,
          comments: (engagementData.comments || 0) + 1,
          last_updated: new Date().toISOString()
        }
      });

      // Update analytics
      await postingAnalytics.updatePostAnalytics(post.id, {
        comments: (engagementData.comments || 0) + 1
      });
    }
  } catch (error) {
    logger.error('Comment update error:', error);
  }
}

/**
 * Handle engagement update
 * @param {Object} engagementData - Engagement data
 */
async function handleEngagementUpdate(engagementData) {
  try {
    const postId = engagementData.post_id;
    
    // Find post by platform_post_id
    const posts = await PostModel.getPosts({
      platform_post_id: postId,
      limit: 1
    });

    if (posts.length > 0) {
      const post = posts[0];
      
      await PostModel.update(post.id, {
        engagement_data: {
          ...(post.engagement_data || {}),
          metrics: {
            likes: engagementData.likes || 0,
            comments: engagementData.comments || 0,
            shares: engagementData.shares || 0
          },
          last_updated: new Date().toISOString()
        }
      });

      // Update analytics
      await postingAnalytics.updatePostAnalytics(post.id, {
        metrics: {
          likes: engagementData.likes || 0,
          comments: engagementData.comments || 0,
          shares: engagementData.shares || 0
        }
      });
    }
  } catch (error) {
    logger.error('Engagement update error:', error);
  }
}

module.exports = router;


