const { supabaseAdmin } = require('../../config/supabase');
const TrendingTopicModel = require('../../models/TrendingTopic');
const ContentModel = require('../../models/Content');

/**
 * Trend Analytics Service
 * Tracks trend performance and usage
 */
class TrendAnalyticsService {
  /**
   * Track trend usage (when content is created from a trend)
   * @param {string} trendId - Trend ID
   * @param {string} contentId - Content ID created from trend
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Analytics record
   */
  async trackTrendUsage(trendId, contentId, userId) {
    try {
      // This would ideally be stored in a trend_analytics table
      // For now, we'll update the trend metadata
      const trend = await TrendingTopicModel.getById(trendId);
      if (!trend) {
        throw new Error('Trend not found');
      }

      // Get existing analytics or create new
      const analytics = trend.metadata?.analytics || {
        usage_count: 0,
        content_created: [],
        users: [],
        first_used_at: null,
        last_used_at: null
      };

      // Update analytics
      analytics.usage_count = (analytics.usage_count || 0) + 1;
      analytics.content_created = [...(analytics.content_created || []), contentId];
      if (!analytics.users.includes(userId)) {
        analytics.users.push(userId);
      }
      analytics.last_used_at = new Date().toISOString();
      if (!analytics.first_used_at) {
        analytics.first_used_at = new Date().toISOString();
      }

      // Update trend (note: your schema doesn't have metadata column, so this is a placeholder)
      // In production, you'd want to add a metadata JSONB column or create a separate analytics table
      return analytics;
    } catch (error) {
      console.error('Failed to track trend usage:', error);
      throw error;
    }
  }

  /**
   * Get trend performance analytics
   * @param {string} trendId - Trend ID
   * @returns {Promise<Object>} Analytics data
   */
  async getTrendAnalytics(trendId) {
    try {
      const trend = await TrendingTopicModel.getById(trendId);
      if (!trend) {
        throw new Error('Trend not found');
      }

      // Get content created from this trend
      const content = await ContentModel.getByUserId(null, {
        // Search in metadata for trend references
        // This is a simplified version - in production, you'd have a proper relationship
      });

      const analytics = {
        trend_id: trendId,
        topic: trend.topic,
        viral_score: trend.viral_score,
        relevance_score: trend.relevance_score,
        created_at: trend.created_at,
        expires_at: trend.expires_at,
        usage_count: 0,
        content_count: 0,
        user_count: 0,
        performance: {
          score_trend: 'stable', // Can be calculated based on score changes
          engagement_rate: 0,
          conversion_rate: 0
        }
      };

      return analytics;
    } catch (error) {
      console.error('Failed to get trend analytics:', error);
      throw error;
    }
  }

  /**
   * Get trending topics performance summary
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Object>} Performance summary
   */
  async getPerformanceSummary(filters = {}) {
    try {
      const trends = await TrendingTopicModel.getTrendingTopics({
        ...filters,
        limit: 100
      });

      const summary = {
        total_trends: trends.length,
        average_viral_score: 0,
        average_relevance_score: 0,
        top_category: null,
        top_platform: null,
        trends_by_category: {},
        trends_by_platform: {},
        score_distribution: {
          high: 0, // 80-100
          medium: 0, // 50-79
          low: 0 // 0-49
        }
      };

      if (trends.length === 0) {
        return summary;
      }

      let totalViral = 0;
      let totalRelevance = 0;
      const categoryCount = {};
      const platformCount = {};

      trends.forEach(trend => {
        totalViral += trend.viral_score || 0;
        totalRelevance += trend.relevance_score || 0;

        // Category distribution
        const cat = trend.category || 'general';
        categoryCount[cat] = (categoryCount[cat] || 0) + 1;

        // Platform distribution
        const plat = trend.platform || 'general';
        platformCount[plat] = (platformCount[plat] || 0) + 1;

        // Score distribution
        if (trend.viral_score >= 80) summary.score_distribution.high++;
        else if (trend.viral_score >= 50) summary.score_distribution.medium++;
        else summary.score_distribution.low++;
      });

      summary.average_viral_score = Math.round(totalViral / trends.length);
      summary.average_relevance_score = Math.round(totalRelevance / trends.length);

      // Find top category
      const topCategory = Object.entries(categoryCount)
        .sort((a, b) => b[1] - a[1])[0];
      summary.top_category = topCategory ? topCategory[0] : null;

      // Find top platform
      const topPlatform = Object.entries(platformCount)
        .sort((a, b) => b[1] - a[1])[0];
      summary.top_platform = topPlatform ? topPlatform[0] : null;

      summary.trends_by_category = categoryCount;
      summary.trends_by_platform = platformCount;

      return summary;
    } catch (error) {
      console.error('Failed to get performance summary:', error);
      throw error;
    }
  }

  /**
   * Track trend score changes over time
   * @param {string} trendId - Trend ID
   * @param {number} newScore - New viral score
   * @returns {Promise<Object>} Score history
   */
  async trackScoreChange(trendId, newScore) {
    try {
      const trend = await TrendingTopicModel.getById(trendId);
      if (!trend) {
        throw new Error('Trend not found');
      }

      const oldScore = trend.viral_score || 0;
      const scoreChange = newScore - oldScore;
      const changePercent = oldScore > 0 ? ((scoreChange / oldScore) * 100) : 0;

      // In production, store score history in a separate table
      const scoreHistory = {
        trend_id: trendId,
        old_score: oldScore,
        new_score: newScore,
        change: scoreChange,
        change_percent: changePercent,
        timestamp: new Date().toISOString()
      };

      return scoreHistory;
    } catch (error) {
      console.error('Failed to track score change:', error);
      throw error;
    }
  }
}

module.exports = new TrendAnalyticsService();

