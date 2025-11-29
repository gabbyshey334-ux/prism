const trendResearchService = require('../services/trends/trendResearch');
const trendAnalytics = require('../services/trends/trendAnalytics');
const TrendingTopicModel = require('../models/TrendingTopic');
const ContentModel = require('../models/Content');
const logger = require('../workers/logger');

/**
 * Trends Controller
 * Handles trend discovery, research, and scoring
 */
class TrendsController {
  /**
   * Discover trends from multiple sources
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async discoverTrends(req, res) {
    try {
      const {
        category,
        platform,
        limit = 20,
        autoSave = false
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      // Discover trends
      const discoveredTrends = await trendResearchService.discoverTrends({
        category,
        platform,
        limit
      });

      // Score each trend
      const scoredTrends = [];
      for (const trend of discoveredTrends) {
        try {
          const viralScore = await trendResearchService.scoreTrend(trend);
          const scoredTrend = {
            ...trend,
            viral_score: viralScore,
            relevance_score: 50 // Default, can be calculated based on user context
          };

          // Auto-save to database if requested
          if (autoSave) {
            try {
              const saved = await TrendingTopicModel.create({
                user_id: userId,
                platform: trend.platform,
                topic: trend.topic,
                description: trend.description,
                hashtags: trend.keywords || [],
                viral_score: viralScore,
                relevance_score: 50,
                volume: trend.volume,
                source: trend.source,
                category: trend.category,
                expires_at: trend.expires_at || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days default
              });
              scoredTrend.id = saved.id;
              scoredTrend.saved = true;
            } catch (saveError) {
              logger.warn('Failed to save trend:', saveError.message);
              scoredTrend.saved = false;
            }
          }

          scoredTrends.push(scoredTrend);
        } catch (scoreError) {
          logger.warn(`Failed to score trend "${trend.topic}":`, scoreError.message);
          scoredTrends.push({
            ...trend,
            viral_score: 0,
            relevance_score: 0
          });
        }
      }

      // Sort by viral score
      scoredTrends.sort((a, b) => b.viral_score - a.viral_score);

      res.json({
        success: true,
        trends: scoredTrends,
        count: scoredTrends.length,
        filters: {
          category,
          platform,
          limit
        }
      });
    } catch (error) {
      logger.error('Discover trends error:', error);
      res.status(500).json({
        error: 'trend_discovery_failed',
        message: error.message
      });
    }
  }

  /**
   * Research a specific trend
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async researchTrend(req, res) {
    try {
      const { topicId } = req.params;
      const { platform } = req.query;

      // Get topic from database if topicId provided
      let topic = null;
      if (topicId && topicId !== 'new') {
        topic = await TrendingTopicModel.getById(topicId);
        if (!topic) {
          return res.status(404).json({
            error: 'topic_not_found',
            message: 'Trending topic not found'
          });
        }
      }

      // Get topic text
      const topicText = topic?.topic || req.body.topic;
      if (!topicText) {
        return res.status(400).json({
          error: 'topic_required',
          message: 'Topic is required'
        });
      }

      // Research the trend
      const research = await trendResearchService.researchTrend({
        topic: topicText,
        platform: platform || topic?.platform
      });

      // Update topic with research if it exists
      if (topic) {
        await TrendingTopicModel.update(topicId, {
          description: research.research_data.context || topic.description,
          hashtags: research.research_data.hashtags || topic.hashtags || []
        });
      }

      res.json({
        success: true,
        topic: topic || { topic: topicText },
        research: research.research_data,
        researched_at: research.researched_at
      });
    } catch (error) {
      logger.error('Research trend error:', error);
      res.status(500).json({
        error: 'trend_research_failed',
        message: error.message
      });
    }
  }

  /**
   * Score a trend for viral potential
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async scoreTrend(req, res) {
    try {
      const { topicId, trend } = req.body;

      let topicData = trend;
      
      // Get from database if topicId provided
      if (topicId && !trend) {
        topicData = await TrendingTopicModel.getById(topicId);
        if (!topicData) {
          return res.status(404).json({
            error: 'topic_not_found',
            message: 'Trending topic not found'
          });
        }
      }

      if (!topicData) {
        return res.status(400).json({
          error: 'trend_required',
          message: 'Either topicId or trend object is required'
        });
      }

      // Score the trend
      const viralScore = await trendResearchService.scoreTrend(topicData);

      // Update database if topicId provided
      if (topicId) {
        await TrendingTopicModel.updateViralScore(topicId, viralScore);
      }

      res.json({
        success: true,
        topic: topicData.topic || topicData.id,
        viral_score: viralScore,
        scored_at: new Date().toISOString()
      });
    } catch (error) {
      logger.error('Score trend error:', error);
      res.status(500).json({
        error: 'trend_scoring_failed',
        message: error.message
      });
    }
  }

  /**
   * Get trending topics list
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getTrendingTopics(req, res) {
    try {
      const userId = req.user?.uid;
      const {
        platform,
        category,
        min_viral_score,
        min_relevance_score,
        source,
        limit = 50,
        offset = 0,
        search
      } = req.query;

      const filters = {
        user_id: userId !== undefined ? userId : null, // null = global trends
        platform: platform || undefined,
        category: category || undefined,
        min_viral_score: min_viral_score ? parseInt(min_viral_score) : undefined,
        min_relevance_score: min_relevance_score ? parseInt(min_relevance_score) : undefined,
        source: source || undefined,
        limit: parseInt(limit),
        offset: parseInt(offset),
        include_expired: false
      };

      let topics;
      if (search) {
        topics = await TrendingTopicModel.search(search, filters);
      } else {
        topics = await TrendingTopicModel.getTrendingTopics(filters);
      }

      res.json({
        success: true,
        trends: topics,
        count: topics.length,
        filters: {
          platform,
          category,
          min_viral_score,
          min_relevance_score,
          source,
          limit,
          offset
        }
      });
    } catch (error) {
      logger.error('Get trending topics error:', error);
      res.status(500).json({
        error: 'fetch_trends_failed',
        message: error.message
      });
    }
  }

  /**
   * Suggest content based on trends
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async suggestContent(req, res) {
    try {
      const {
        brandId,
        platform,
        category,
        limit = 5
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      // Get relevant trends
      const trends = await TrendingTopicModel.getTrendingTopics({
        platform: platform || undefined,
        category: category || undefined,
        min_viral_score: 60,
        limit: limit * 2, // Get more to filter
        include_expired: false
      });

      // Filter and format for content suggestions
      const suggestions = trends.slice(0, limit).map(trend => ({
        trend_id: trend.id,
        topic: trend.topic,
        description: trend.description,
        viral_score: trend.viral_score,
        relevance_score: trend.relevance_score,
        hashtags: trend.hashtags || [],
        category: trend.category,
        platform: trend.platform,
        content_ideas: [
          `Create a post about: ${trend.topic}`,
          `Share your perspective on: ${trend.topic}`,
          `Join the conversation about: ${trend.topic}`
        ],
        suggested_formats: ['post', 'story', 'reel']
      }));

      res.json({
        success: true,
        suggestions,
        count: suggestions.length
      });
    } catch (error) {
      logger.error('Suggest content error:', error);
      res.status(500).json({
        error: 'content_suggestion_failed',
        message: error.message
      });
    }
  }

  /**
   * Get trend analytics
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getAnalytics(req, res) {
    try {
      const { trendId } = req.params;
      const { summary } = req.query;

      if (summary === 'true') {
        // Get performance summary
        const summaryData = await trendAnalytics.getPerformanceSummary({
          platform: req.query.platform,
          category: req.query.category
        });

        res.json({
          success: true,
          summary: summaryData
        });
      } else if (trendId) {
        // Get analytics for specific trend
        const analytics = await trendAnalytics.getTrendAnalytics(trendId);

        res.json({
          success: true,
          analytics
        });
      } else {
        return res.status(400).json({
          error: 'invalid_request',
          message: 'Either trendId or summary=true is required'
        });
      }
    } catch (error) {
      logger.error('Get analytics error:', error);
      res.status(500).json({
        error: 'analytics_fetch_failed',
        message: error.message
      });
    }
  }
}

module.exports = TrendsController;

