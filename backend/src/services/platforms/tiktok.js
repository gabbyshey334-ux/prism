const axios = require('axios');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * TikTok Platform Service
 */
class TikTokService extends BasePlatformService {
  constructor() {
    super('tiktok');
    this.apiBase = 'https://open.tiktokapis.com';
  }

  /**
   * Format content for TikTok
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    let caption = content.text || content.caption || '';
    const hashtags = content.hashtags || [];
    const mentions = content.mentions || [];

    // Add hashtags
    if (hashtags.length > 0) {
      const hashtagText = hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      caption += ` ${hashtagText}`;
    }

    // Add mentions
    if (mentions.length > 0) {
      const mentionText = mentions.map(mention =>
        mention.startsWith('@') ? mention : `@${mention}`
      ).join(' ');
      caption = `${mentionText} ${caption}`;
    }

    // TikTok caption limit: 2,200 characters
    if (caption.length > 2200) {
      caption = caption.substring(0, 2197) + '...';
    }

    return {
      caption,
      hashtags,
      mentions,
      media: content.media || []
    };
  }

  /**
   * Validate content
   * @param {Object} content - Content data
   * @returns {Object} Validation result
   */
  validateContent(content) {
    const result = super.validateContent(content);
    const errors = [...result.errors];
    const warnings = [...result.warnings];

    // TikTok requires video
    if (!content.media || content.media.length === 0) {
      errors.push('TikTok posts require a video file');
    }

    // TikTok only supports video
    if (content.media && content.media.some(m => !m.type?.includes('video'))) {
      warnings.push('TikTok only supports video content');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Post content to TikTok
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    const validation = this.validateContent(content);
    if (!validation.valid) {
      throw new Error(`Content validation failed: ${validation.errors.join(', ')}`);
    }

    const formatted = this.formatContent(content);
    const accessToken = connection.access_token;

    try {
      // TikTok video upload requires multiple steps
      // Step 1: Initialize upload
      const initResponse = await axios.post(
        `${this.apiBase}/v2/post/publish/video/init/`,
        {
          post_info: {
            title: formatted.caption,
            privacy_level: 'PUBLIC_TO_EVERYONE',
            disable_duet: false,
            disable_comment: false,
            disable_stitch: false,
            video_cover_timestamp_ms: 1000
          },
          source_info: {
            source: 'FILE_UPLOAD'
          }
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const publishId = initResponse.data.data.publish_id;

      // Step 2: Upload video file (simplified - actual implementation requires chunked upload)
      // For now, assume video URL is provided and TikTok can fetch it
      const uploadResponse = await axios.put(
        `${this.apiBase}/v2/post/publish/video/upload/`,
        {
          publish_id: publishId,
          video_url: content.media[0].url || content.media[0]
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      // Step 3: Publish
      const publishResponse = await axios.post(
        `${this.apiBase}/v2/post/publish/status/fetch/`,
        {
          publish_id: publishId
        },
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        platform: 'tiktok',
        postId: publishId,
        url: `https://www.tiktok.com/@${connection.platform_username}/video/${publishId}`,
        status: publishResponse.data.data.status,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('TikTok post error:', error.response?.data || error.message);
      throw new Error(`TikTok post failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh TikTok token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    try {
      const response = await axios.post(
        `${this.apiBase}/v2/oauth/token/`,
        {
          client_key: process.env.TIKTOK_CLIENT_KEY,
          client_secret: process.env.TIKTOK_CLIENT_SECRET,
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token
        }
      );

      return {
        access_token: response.data.data.access_token,
        refresh_token: response.data.data.refresh_token,
        expires_at: new Date(Date.now() + (response.data.data.expires_in * 1000)).toISOString()
      };
    } catch (error) {
      throw new Error(`TikTok token refresh failed: ${error.response?.data?.error?.message || error.message}`);
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
      const response = await axios.post(
        `${this.apiBase}/v2/post/publish/status/fetch/`,
        {
          publish_id: postId
        },
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        postId,
        status: response.data.data.status,
        postedAt: response.data.data.publish_time || new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get TikTok post status: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Delete post
   * @param {Object} connection - Connection object
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} Success
   */
  async deletePost(connection, postId) {
    // TikTok API doesn't support post deletion via API
    throw new Error('TikTok does not support post deletion via API');
  }
}

module.exports = new TikTokService();


