const axios = require('axios');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * LinkedIn Platform Service
 */
class LinkedInService extends BasePlatformService {
  constructor() {
    super('linkedin');
    this.apiBase = 'https://api.linkedin.com';
    this.apiVersion = 'v2';
  }

  /**
   * Format content for LinkedIn
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    let text = content.text || content.message || '';
    const hashtags = content.hashtags || [];

    // Add hashtags
    if (hashtags.length > 0) {
      const hashtagText = hashtags.map(tag => 
        tag.startsWith('#') ? tag : `#${tag}`
      ).join(' ');
      text += ` ${hashtagText}`;
    }

    // LinkedIn post limit: 3,000 characters
    if (text.length > 3000) {
      text = text.substring(0, 2997) + '...';
    }

    return {
      text,
      hashtags,
      media: content.media || []
    };
  }

  /**
   * Post content to LinkedIn
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    const formatted = this.formatContent(content);
    const accessToken = connection.access_token;
    const personUrn = `urn:li:person:${connection.platform_user_id}`;

    try {
      // Upload images if provided
      let imageUrns = [];
      if (content.media && content.media.length > 0) {
        for (const mediaItem of content.media) {
          // Register upload
          const registerResponse = await axios.post(
            `${this.apiBase}/${this.apiVersion}/assets?action=registerUpload`,
            {
              registerUploadRequest: {
                recipes: ['urn:li:digitalmediaRecipe:feedshare-image'],
                owner: personUrn,
                serviceRelationships: [{
                  relationshipType: 'OWNER',
                  identifier: 'urn:li:userGeneratedContent'
                }]
              }
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const uploadUrl = registerResponse.data.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
          const asset = registerResponse.data.value.asset;

          // Upload image
          await axios.put(uploadUrl, mediaItem.url || mediaItem, {
            headers: {
              'Content-Type': 'image/jpeg'
            }
          });

          imageUrns.push(asset);
        }
      }

      // Create post
      const postData = {
        author: personUrn,
        lifecycleState: 'PUBLISHED',
        specificContent: {
          'com.linkedin.ugc.ShareContent': {
            shareCommentary: {
              text: formatted.text
            },
            shareMediaCategory: imageUrns.length > 0 ? 'IMAGE' : 'NONE'
          }
        },
        visibility: {
          'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
        }
      };

      if (imageUrns.length > 0) {
        postData.specificContent['com.linkedin.ugc.ShareContent'].media = imageUrns.map(urn => ({
          status: 'READY',
          media: urn,
          title: {
            text: formatted.text.substring(0, 100)
          }
        }));
      }

      const postResponse = await axios.post(
        `${this.apiBase}/${this.apiVersion}/ugcPosts`,
        postData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        success: true,
        platform: 'linkedin',
        postId: postResponse.data.id,
        url: `https://www.linkedin.com/feed/update/${postResponse.data.id}`,
        mediaIds: imageUrns,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('LinkedIn post error:', error.response?.data || error.message);
      throw new Error(`LinkedIn post failed: ${error.response?.data?.message || error.message}`);
    }
  }

  /**
   * Refresh LinkedIn token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    try {
      const response = await axios.post(
        'https://www.linkedin.com/oauth/v2/accessToken',
        {
          grant_type: 'refresh_token',
          refresh_token: connection.refresh_token,
          client_id: process.env.LINKEDIN_CLIENT_ID,
          client_secret: process.env.LINKEDIN_CLIENT_SECRET
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token || connection.refresh_token,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };
    } catch (error) {
      throw new Error(`LinkedIn token refresh failed: ${error.response?.data?.error_description || error.message}`);
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
      const response = await axios.get(
        `${this.apiBase}/${this.apiVersion}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return {
        postId: response.data.id,
        status: response.data.lifecycleState === 'PUBLISHED' ? 'published' : 'pending',
        url: `https://www.linkedin.com/feed/update/${postId}`,
        postedAt: response.data.created?.time || new Date().toISOString()
      };
    } catch (error) {
      throw new Error(`Failed to get LinkedIn post status: ${error.response?.data?.message || error.message}`);
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
      await axios.delete(
        `${this.apiBase}/${this.apiVersion}/ugcPosts/${postId}`,
        {
          headers: {
            'Authorization': `Bearer ${connection.access_token}`,
            'X-Restli-Protocol-Version': '2.0.0'
          }
        }
      );

      return true;
    } catch (error) {
      throw new Error(`Failed to delete LinkedIn post: ${error.response?.data?.message || error.message}`);
    }
  }
}

module.exports = new LinkedInService();


