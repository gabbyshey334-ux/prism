const axios = require('axios');
const BasePlatformService = require('./basePlatform');
const logger = require('../../workers/logger');

/**
 * Twitter/X Platform Service
 */
class TwitterService extends BasePlatformService {
  constructor() {
    super('twitter');
    this.apiBase = 'https://api.twitter.com/2';
  }

  /**
   * Format content for Twitter/X
   * @param {Object} content - Content data
   * @returns {Object} Formatted content
   */
  formatContent(content) {
    let text = content.text || content.tweet || '';
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

    // Twitter/X limit: 280 characters
    if (text.length > 280) {
      text = text.substring(0, 277) + '...';
    }

    return {
      text,
      hashtags,
      mentions,
      media: content.media || []
    };
  }

  /**
   * Post content to Twitter/X
   * @param {Object} connection - Connection object
   * @param {Object} content - Content data
   * @returns {Promise<Object>} Post result
   */
  async post(connection, content) {
    const formatted = this.formatContent(content);
    const accessToken = connection.access_token;

    try {
      // Upload media if provided
      let mediaIds = [];
      if (content.media && content.media.length > 0) {
        for (const mediaItem of content.media) {
          // Twitter media upload requires multiple steps
          // Step 1: Initialize upload
          const initResponse = await axios.post(
            'https://upload.twitter.com/1.1/media/upload.json',
            {
              command: 'INIT',
              total_bytes: mediaItem.size || 0,
              media_type: mediaItem.type || 'image/jpeg'
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          const mediaId = initResponse.data.media_id_string;

          // Step 2: Upload chunks (simplified - actual requires chunked upload)
          // Step 3: Finalize
          await axios.post(
            'https://upload.twitter.com/1.1/media/upload.json',
            {
              command: 'FINALIZE',
              media_id: mediaId
            },
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            }
          );

          mediaIds.push(mediaId);
        }
      }

      // Create tweet
      const tweetData = {
        text: formatted.text
      };

      if (mediaIds.length > 0) {
        tweetData.media = {
          media_ids: mediaIds
        };
      }

      const tweetResponse = await axios.post(
        `${this.apiBase}/tweets`,
        tweetData,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      return {
        success: true,
        platform: 'twitter',
        postId: tweetResponse.data.data.id,
        url: `https://twitter.com/${connection.platform_username}/status/${tweetResponse.data.data.id}`,
        mediaIds,
        postedAt: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Twitter post error:', error.response?.data || error.message);
      throw new Error(`Twitter post failed: ${error.response?.data?.detail || error.message}`);
    }
  }

  /**
   * Refresh Twitter token
   * @param {Object} connection - Connection object
   * @returns {Promise<Object>} New tokens
   */
  async doRefreshToken(connection) {
    try {
      const response = await axios.post(
        'https://api.twitter.com/2/oauth2/token',
        {
          refresh_token: connection.refresh_token,
          grant_type: 'refresh_token',
          client_id: process.env.TWITTER_CLIENT_ID,
          client_secret: process.env.TWITTER_CLIENT_SECRET
        }
      );

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_at: new Date(Date.now() + (response.data.expires_in * 1000)).toISOString()
      };
    } catch (error) {
      throw new Error(`Twitter token refresh failed: ${error.response?.data?.error_description || error.message}`);
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
      const response = await axios.get(`${this.apiBase}/tweets/${postId}`, {
        params: {
          'tweet.fields': 'created_at,public_metrics'
        },
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      const tweet = response.data.data;

      return {
        postId: tweet.id,
        status: 'published',
        url: `https://twitter.com/${connection.platform_username}/status/${tweet.id}`,
        metrics: {
          likes: tweet.public_metrics.like_count || 0,
          retweets: tweet.public_metrics.retweet_count || 0,
          replies: tweet.public_metrics.reply_count || 0
        },
        postedAt: tweet.created_at
      };
    } catch (error) {
      throw new Error(`Failed to get Twitter post status: ${error.response?.data?.detail || error.message}`);
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
      await axios.delete(`${this.apiBase}/tweets/${postId}`, {
        headers: {
          'Authorization': `Bearer ${connection.access_token}`
        }
      });

      return true;
    } catch (error) {
      throw new Error(`Failed to delete Twitter post: ${error.response?.data?.detail || error.message}`);
    }
  }
}

module.exports = new TwitterService();


