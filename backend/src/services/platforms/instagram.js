const axios = require('axios');
const FormData = require('form-data');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * Instagram Platform Service
 */
class InstagramService extends BasePlatformService {
  constructor() {
    super('instagram');
    this.apiBase = 'https://graph.instagram.com';
    this.apiVersion = 'v18.0';
  }

  /**
   * Format content for Instagram
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    let text = content.text || content.caption || '';
    const hashtags = content.hashtags || [];
    const mentions = content.mentions || [];

    // Add hashtags
    if (hashtags.length > 0) {
      const hashtagText = hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      text += ` ${hashtagText}`;
    }

    // Add mentions
    if (mentions.length > 0) {
      const mentionText = mentions.map(mention =>
        mention.startsWith('@') ? mention : `@${mention}`
      ).join(' ');
      text = `${mentionText} ${text}`;
    }

    // Instagram caption limit: 2,200 characters
    if (text.length > 2200) {
      text = text.substring(0, 2197) + '...';
    }

    return {
      caption: text,
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

    // Instagram requires media for posts
    if (!content.media || content.media.length === 0) {
      errors.push('Instagram posts require at least one media file');
    }

    // Media limit: 10 images or 1 video
    if (content.media && content.media.length > 10) {
      errors.push('Instagram posts can have maximum 10 images');
    }

    // Caption length
    const formatted = this.formatContent(content);
    if (formatted.caption.length > 2200) {
      warnings.push('Caption exceeds 2,200 characters and will be truncated');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload media to Instagram
   * @param {Object} connection - Connection object
   * @param {Buffer|string} media - Media file or URL
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Media container ID
   */
  async uploadMedia(connection, media, options = {}) {
    const { mediaType = 'IMAGE', isCarousel = false } = options;
    const accessToken = connection.access_token;

    try {
      // Step 1: Create media container
      const containerUrl = `${this.apiBase}/${this.apiVersion}/${connection.platform_user_id}/media`;
      
      const containerParams = {
        access_token: accessToken,
        media_type: mediaType,
        caption: options.caption || ''
      };

      if (typeof media === 'string') {
        // Media is a URL
        containerParams[mediaType === 'IMAGE' ? 'image_url' : 'video_url'] = media;
      } else {
        // Media is a buffer - upload to temporary location first
        // For now, assume media is provided as URL
        throw new Error('Direct buffer upload not yet implemented. Please provide media URL.');
      }

      const containerResponse = await axios.post(containerUrl, containerParams);
      const containerId = containerResponse.data.id;

      // Step 2: Publish media container
      const publishUrl = `${this.apiBase}/${this.apiVersion}/${connection.platform_user_id}/media_publish`;
      const publishResponse = await axios.post(publishUrl, {
        access_token: accessToken,
        creation_id: containerId
      });

      return {
        containerId,
        mediaId: publishResponse.data.id,
        status: 'published'
      };
    } catch (error) {
      logger.error('Instagram media upload error:', error.response?.data || error.message);
      throw new Error(`Instagram upload failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Post content to Instagram
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
      // Upload media first
      const mediaResults = [];
      for (const mediaItem of content.media) {
        const mediaType = mediaItem.type || (mediaItem.url?.includes('.mp4') ? 'VIDEO' : 'IMAGE');
        const uploadResult = await this.uploadMedia(connection, mediaItem.url || mediaItem, {
          mediaType,
          caption: formatted.caption
        });
        mediaResults.push(uploadResult);
      }

      // For single media, return the published post
      if (mediaResults.length === 1) {
        return {
          success: true,
          platform: 'instagram',
          postId: mediaResults[0].mediaId,
          url: `https://www.instagram.com/p/${mediaResults[0].mediaId}/`,
          mediaIds: [mediaResults[0].mediaId],
          postedAt: new Date().toISOString()
        };
      }

      // For carousel (multiple images), create carousel container
      // This is a simplified version - full carousel requires additional API calls
      return {
        success: true,
        platform: 'instagram',
        postId: mediaResults[0].mediaId,
        url: `https://www.instagram.com/p/${mediaResults[0].mediaId}/`,
        mediaIds: mediaResults.map(r => r.mediaId),
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Instagram post error:', error.response?.data || error.message);
      throw new Error(`Instagram post failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh Instagram token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    try {
      const response = await axios.get(`${this.apiBase}/refresh_access_token`, {
        params: {
          grant_type: 'ig_refresh_token',
          access_token: connection.access_token
        }
      });

      return {
        access_token: response.data.access_token,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };
    } catch (error) {
      throw new Error(`Instagram token refresh failed: ${error.response?.data?.error?.message || error.message}`);
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
          fields: 'id,media_type,timestamp,permalink,like_count,comments_count'
        }
      });

      return {
        postId: response.data.id,
        status: 'published',
        url: response.data.permalink,
        metrics: {
          likes: response.data.like_count || 0,
          comments: response.data.comments_count || 0
        },
        postedAt: response.data.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to get Instagram post status: ${error.response?.data?.error?.message || error.message}`);
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
      throw new Error(`Failed to delete Instagram post: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new InstagramService();


