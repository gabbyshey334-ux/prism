const axios = require('axios');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * Facebook Platform Service
 */
class FacebookService extends BasePlatformService {
  constructor() {
    super('facebook');
    this.apiBase = 'https://graph.facebook.com';
    this.apiVersion = 'v18.0';
  }

  /**
   * Format content for Facebook
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    let message = content.text || content.message || '';
    const hashtags = content.hashtags || [];
    const mentions = content.mentions || [];

    // Add hashtags
    if (hashtags.length > 0) {
      const hashtagText = hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      message += ` ${hashtagText}`;
    }

    // Facebook message limit: 63,206 characters
    if (message.length > 63206) {
      message = message.substring(0, 63203) + '...';
    }

    return {
      message,
      hashtags,
      mentions,
      media: content.media || []
    };
  }

  /**
   * Post content to Facebook
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    const formatted = this.formatContent(content);
    const accessToken = connection.access_token;
    const pageId = connection.platform_user_id; // Facebook page ID

    try {
      // Upload photos if provided
      let attachedMedia = [];
      if (content.media && content.media.length > 0) {
        for (const mediaItem of content.media) {
          // Upload photo
          const photoResponse = await axios.post(
            `${this.apiBase}/${this.apiVersion}/${pageId}/photos`,
            {
              url: mediaItem.url || mediaItem,
              caption: formatted.message,
              access_token: accessToken
            }
          );
          attachedMedia.push(photoResponse.data.id);
        }

        // If multiple photos, create album post
        if (attachedMedia.length > 1) {
          // Facebook doesn't support multi-photo posts directly
          // Post first photo with message
          const postResponse = await axios.post(
            `${this.apiBase}/${this.apiVersion}/${pageId}/feed`,
            {
              message: formatted.message,
              attached_media: attachedMedia.map(id => ({ media_fbid: id })),
              access_token: accessToken
            }
          );

          return {
            success: true,
            platform: 'facebook',
            postId: postResponse.data.id,
            url: `https://www.facebook.com/${postResponse.data.id}`,
            mediaIds: attachedMedia,
            postedAt: new Date().toISOString()
          };
        }
      }

      // Post to page feed
      const postParams = {
        message: formatted.message,
        access_token: accessToken
      };

      if (attachedMedia.length === 1) {
        postParams.attached_media = [{ media_fbid: attachedMedia[0] }];
      }

      const postResponse = await axios.post(
        `${this.apiBase}/${this.apiVersion}/${pageId}/feed`,
        postParams
      );

      return {
        success: true,
        platform: 'facebook',
        postId: postResponse.data.id,
        url: `https://www.facebook.com/${postResponse.data.id}`,
        mediaIds: attachedMedia,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Facebook post error:', error.response?.data || error.message);
      throw new Error(`Facebook post failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh Facebook token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    try {
      const response = await axios.get(`${this.apiBase}/oauth/access_token`, {
        params: {
          grant_type: 'fb_exchange_token',
          client_id: process.env.FACEBOOK_APP_ID,
          client_secret: process.env.FACEBOOK_APP_SECRET,
          fb_exchange_token: connection.access_token
        }
      });

      return {
        access_token: response.data.access_token,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };
    } catch (error) {
      throw new Error(`Facebook token refresh failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Get post status
   * @param {Object} connection - Connection object
   * @param {string} postId - Post ID
   * @returns {Promise<Object>} Post status
   */
  async getPostStatus(connection, postId) {
    try {
      const response = await axios.get(`${this.apiBase}/${this.apiVersion}/${postId}`, {
        params: {
          access_token: connection.access_token,
          fields: 'id,created_time,message,likes.summary(true),comments.summary(true),shares'
        }
      });

      return {
        postId: response.data.id,
        status: 'published',
        url: `https://www.facebook.com/${postId}`,
        metrics: {
          likes: response.data.likes?.summary?.total_count || 0,
          comments: response.data.comments?.summary?.total_count || 0,
          shares: response.data.shares?.count || 0
        },
        postedAt: response.data.created_time
      };
    } catch (error) {
      throw new Error(`Failed to get Facebook post status: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete post
   * @param {Object} connection - Connection object
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} Success
   */
  async deletePost(connection, postId) {
    try {
      await axios.delete(`${this.apiBase}/${this.apiVersion}/${postId}`, {
        params: {
          access_token: connection.access_token
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to delete Facebook post: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new FacebookService();


