const axios = require('axios');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * Threads Platform Service
 * Note: Threads API is relatively new and may have limited functionality
 */
class ThreadsService extends BasePlatformService {
  constructor() {
    super('threads');
    this.apiBase = 'https://graph.threads.net';
    this.apiVersion = 'v1.0';
  }

  /**
   * Format content for Threads
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

    // Threads caption limit: 500 characters
    if (text.length > 500) {
      text = text.substring(0, 497) + '...';
    }

    return {
      caption: text,
      hashtags,
      mentions,
      media: content.media || []
    };
  }

  /**
   * Post content to Threads
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    const formatted = this.formatContent(content);
    const accessToken = connection.access_token;
    const userId = connection.platform_user_id;

    try {
      // Threads uses Instagram Graph API
      // Step 1: Create media container
      const containerUrl = `${this.apiBase}/${this.apiVersion}/${userId}/threads`;
      
      const containerParams = {
        access_token: accessToken,
        media_type: content.media?.[0]?.type?.includes('video') ? 'VIDEO' : 'IMAGE',
        caption: formatted.caption
      };

      if (content.media && content.media.length > 0) {
        containerParams[containerParams.media_type === 'VIDEO' ? 'video_url' : 'image_url'] = 
          content.media[0].url || content.media[0];
      }

      const containerResponse = await axios.post(containerUrl, containerParams);
      const containerId = containerResponse.data.id;

      // Step 2: Publish
      const publishUrl = `${this.apiBase}/${this.apiVersion}/${userId}/threads_publish`;
      const publishResponse = await axios.post(publishUrl, {
        access_token: accessToken,
        creation_id: containerId
      });

      return {
        success: true,
        platform: 'threads',
        postId: publishResponse.data.id,
        url: `https://www.threads.net/@${connection.platform_username}/post/${publishResponse.data.id}`,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Threads post error:', error.response?.data || error.message);
      throw new Error(`Threads post failed: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Refresh Threads token (uses Instagram token refresh)
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    // Threads uses Instagram OAuth, so use Instagram refresh
    try {
      const response = await axios.get('https://graph.instagram.com/refresh_access_token', {
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
      throw new Error(`Threads token refresh failed: ${error.response?.data?.error?.message || error.message}`);
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
          fields: 'id,timestamp,permalink'
        }
      });

      return {
        postId: response.data.id,
        status: 'published',
        url: response.data.permalink,
        postedAt: response.data.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to get Threads post status: ${error.response?.data?.error?.message || error.message}`);
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
      throw new Error(`Failed to delete Threads post: ${error.response?.data?.error?.message || error.message}`);
    }
  }
}

module.exports = new ThreadsService();


