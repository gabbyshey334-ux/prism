const PostModel = require('../models/Post');
const { supabaseAdmin } = require('../config/supabase');

/**
 * Posting Analytics Service
 * Tracks post performance and metrics
 */
class PostingAnalyticsService {
  /**
   * Get analytics for posts
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Analytics data
   */
  async getAnalytics(filters = {}) {
    try {
      const posts = await PostModel.getPosts({
        ...filters,
        status: 'success',
        limit: 1000
      });

      const analytics = {
        total_posts: posts.length,
        total_engagement: 0,
        average_engagement: 0,
        posts_by_platform: {},
        engagement_by_platform: {},
        posts_by_day: {},
        best_performing_posts: [],
        engagement_trend: []
      };

      let totalEngagement = 0;

      posts.forEach(post => {
        const platform = post.platform;
        const engagement = this.calculateEngagement(post.engagement_data);

        // Platform distribution
        analytics.posts_by_platform[platform] = (analytics.posts_by_platform[platform] || 0) + 1;
        analytics.engagement_by_platform[platform] = (analytics.engagement_by_platform[platform] || 0) + engagement;

        // Daily distribution
        if (post.posted_at) {
          const date = new Date(post.posted_at).toISOString().split('T')[0];
          analytics.posts_by_day[date] = (analytics.posts_by_day[date] || 0) + 1;
        }

        // Engagement
        totalEngagement += engagement;

        // Best performing posts
        analytics.best_performing_posts.push({
          postId: post.id,
          platform,
          engagement,
          postedAt: post.posted_at,
          url: post.engagement_data?.url
        });
      });

      analytics.total_engagement = totalEngagement;
      analytics.average_engagement = posts.length > 0 ? totalEngagement / posts.length : 0;

      // Sort best performing
      analytics.best_performing_posts.sort((a, b) => b.engagement - a.engagement);
      analytics.best_performing_posts = analytics.best_performing_posts.slice(0, 10);

      return analytics;
    } catch (error) {
      throw new Error(`Failed to get analytics: ${error.message}`);
    }
  }

  /**
   * Calculate engagement score
   * @param {Object} engagementData - Engagement data
   * @returns {number} Engagement score
   */
  calculateEngagement(engagementData) {
    if (!engagementData || !engagementData.metrics) {
      return 0;
    }

    const metrics = engagementData.metrics;
    return (
      (metrics.likes || 0) +
      (metrics.comments || 0) * 2 +
      (metrics.shares || metrics.retweets || 0) * 3 +
      (metrics.views || 0) * 0.1
    );
  }

  /**
   * Get best times to post
   * @param {string} platform - Platform name
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Best times
   */
  async getBestTimes(platform, userId) {
    try {
      const posts = await PostModel.getPosts({
        user_id: userId,
        platform,
        status: 'success',
        limit: 100
      });

      // Analyze engagement by hour
      const engagementByHour = {};
      
      posts.forEach(post => {
        if (post.posted_at) {
          const hour = new Date(post.posted_at).getHours();
          const engagement = this.calculateEngagement(post.engagement_data);
          
          if (!engagementByHour[hour]) {
            engagementByHour[hour] = { total: 0, count: 0 };
          }
          
          engagementByHour[hour].total += engagement;
          engagementByHour[hour].count += 1;
        }
      });

      // Calculate average engagement per hour
      const bestTimes = Object.entries(engagementByHour)
        .map(([hour, data]) => ({
          hour: parseInt(hour),
          averageEngagement: data.total / data.count,
          postCount: data.count
        }))
        .sort((a, b) => b.averageEngagement - a.averageEngagement)
        .slice(0, 5);

      // If no data, return default best times
      if (bestTimes.length === 0) {
        return this.getDefaultBestTimes(platform);
      }

      return bestTimes;
    } catch (error) {
      throw new Error(`Failed to get best times: ${error.message}`);
    }
  }

  /**
   * Get default best times for platform
   * @param {string} platform - Platform name
   * @returns {Array} Default best times
   */
  getDefaultBestTimes(platform) {
    // Industry-standard best times (in UTC)
    const defaults = {
      instagram: [13, 14, 15, 17, 18], // 1-3 PM, 5-6 PM
      facebook: [13, 15, 16, 17], // 1-5 PM
      twitter: [9, 12, 15, 17], // 9 AM, 12 PM, 3 PM, 5 PM
      linkedin: [8, 12, 17], // 8 AM, 12 PM, 5 PM
      tiktok: [18, 19, 20, 21], // 6-9 PM
      threads: [13, 14, 15, 17, 18], // Similar to Instagram
      youtube: [14, 15, 16, 17] // 2-5 PM
    };

    const hours = defaults[platform] || defaults.instagram;
    
    return hours.map(hour => ({
      hour,
      averageEngagement: 0,
      postCount: 0,
      isDefault: true
    }));
  }

  /**
   * Update post analytics
   * @param {string} postId - Post ID
   * @param {Object} engagementData - Latest engagement data
   */
  async updatePostAnalytics(postId, engagementData) {
    try {
      const post = await PostModel.getById(postId);
      if (!post) {
        throw new Error('Post not found');
      }

      await PostModel.update(postId, {
        engagement_data: {
          ...(post.engagement_data || {}),
          ...engagementData,
          last_updated: new Date().toISOString()
        }
      });
    } catch (error) {
      throw new Error(`Failed to update analytics: ${error.message}`);
    }
  }
}

module.exports = new PostingAnalyticsService();


