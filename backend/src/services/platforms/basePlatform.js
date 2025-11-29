const axios = require('axios');
const SocialMediaConnection = require('../../models/SocialMediaConnection');
const logger = require('../../workers/logger');

/**
 * Base Platform Service
 * Provides common functionality for all social media platforms
 */
class BasePlatformService {
  constructor(platformName) {
    this.platform = platformName;
  }

  /**
   * Get connection for user/brand
   * @param {string} userId - User ID
   * @param {string} brandId - Brand ID (optional)
   * @returns {Promise<Object>} Connection data
   */
  async getConnection(userId, brandId = null) {
    const connection = await SocialMediaConnection.getByUserAndPlatform(
      userId,
      this.platform,
      brandId
    );

    if (!connection || !connection.is_active) {
      throw new Error(`No active ${this.platform} connection found`);
    }

    // Check if token needs refresh
    if (this.isTokenExpired(connection)) {
      await this.refreshToken(connection);
      // Reload connection after refresh
      return await SocialMediaConnection.getById(connection.id);
    }

    return connection;
  }

  /**
   * Check if token is expired
   * @param {Object} connection - Connection object
   * @returns {boolean}
   */
  isTokenExpired(connection) {
    if (!connection.token_expires_at) {
      return false; // No expiration set
    }

    const expiresAt = new Date(connection.token_expires_at);
    const now = new Date();
    const buffer = 5 * 60 * 1000; // 5 minutes buffer

    return expiresAt.getTime() - buffer < now.getTime();
  }

  /**
   * Refresh access token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} Updated connection
   */
  async refreshToken(connection) {
    if (!connection.refresh_token) {
      throw new Error(`No refresh token available for ${this.platform}`);
    }

    try {
      // Platform-specific refresh logic will be implemented in child classes
      const newTokens = await this.doRefreshToken(connection);

      // Update connection
      await SocialMediaConnection.update(connection.id, {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token || connection.refresh_token,
        token_expires_at: newTokens.expires_at || connection.token_expires_at,
        updated_at: new Date().toISOString()
      });

      logger.info(`Refreshed ${this.platform} token for connection ${connection.id}`);
      return newTokens;
    } catch (error) {
      logger.error(`Failed to refresh ${this.platform} token:`, error);
      throw new Error(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Platform-specific token refresh (override in child classes)
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    throw new Error('doRefreshToken must be implemented by platform service');
  }

  /**
   * Format content for platform
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    // Base implementation - override in child classes
    return {
      text: content.text || content.caption || '',
      hashtags: content.hashtags || [],
      mentions: content.mentions || [],
      media: content.media || []
    };
  }

  /**
   * Validate content before posting
   * @param {Object} content - Content data
   * @returns {Object} Validation result
   */
  validateContent(content) {
    const errors = [];
    const warnings = [];

    // Base validation
    if (!content.text && !content.media?.length) {
      errors.push('Content must have text or media');
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Upload media file
   * @param {Object} connection - Connection object
   * @param {Buffer|string} media - Media file or URL
   * @param {Object} options - Upload options
   * @returns {Promise<string>} Media ID or URL
   */
  async uploadMedia(connection, media, options = {}) {
    throw new Error('uploadMedia must be implemented by platform service');
  }

  /**
   * Post content to platform
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    throw new Error('post must be implemented by platform service');
  }

  /**
   * Get post status
   * @param {Object} connection - Connection object
   * @param {string} postId - Platform post ID
   * @returns {Promise<Object>} Post status
   */
  async getPostStatus(connection, postId) {
    throw new Error('getPostStatus must be implemented by platform service');
  }

  /**
   * Delete post
   * @param {Object} connection - Connection object
   * @param {string} postId - Platform post ID
   * @returns {Promise<boolean>} Success
   */
  async deletePost(connection, postId) {
    throw new Error('deletePost must be implemented by platform service');
  }
}

module.exports = BasePlatformService;


