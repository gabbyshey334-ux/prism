const router = require('express').Router();
const TrendsController = require('../controllers/TrendsController');
const TrendingTopicModel = require('../models/TrendingTopic');
const { extractAuth } = require('../middleware/extractAuth');

// Apply auth extraction to all routes
router.use(extractAuth);

/**
 * POST /api/trends/discover
 * Discover trends from multiple sources
 * 
 * Body: {
 *   category: string (optional),
 *   platform: string (optional),
 *   limit: number (default: 20),
 *   autoSave: boolean (default: false)
 * }
 */
router.post('/discover', TrendsController.discoverTrends);

/**
 * POST /api/trends/discover/async
 * Queue trend discovery job (async)
 */
router.post('/discover/async', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId;
    const { category, platform, limit } = req.body;

    const { queueTrendDiscovery } = require('../workers/trendWorker');
    const job = await queueTrendDiscovery({
      category,
      platform,
      limit: limit || 20,
      userId
    });

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      message: 'Trend discovery queued. Use GET /api/trends/jobs/:jobId to check status.'
    });
  } catch (error) {
    res.status(500).json({
      error: 'queue_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trends/jobs/:jobId
 * Get trend discovery job status
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { getTrendJobStatus } = require('../workers/trendWorker');
    const status = await getTrendJobStatus(jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'status_check_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trends/research/:topicId
 * Research a specific trend (topicId can be 'new' for new topic)
 */
router.get('/research/:topicId', TrendsController.researchTrend);

/**
 * POST /api/trends/research
 * Research a new trend (alternative endpoint)
 */
router.post('/research', async (req, res) => {
  try {
    const { topic, platform } = req.body;
    
    if (!topic) {
      return res.status(400).json({
        error: 'topic_required',
        message: 'Topic is required'
      });
    }

    // Use researchTrend with 'new' topicId
    req.params = { topicId: 'new' };
    req.query = { platform };
    await TrendsController.researchTrend(req, res);
  } catch (error) {
    res.status(500).json({
      error: 'research_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/trends/score
 * Score a trend for viral potential
 */
router.post('/score', TrendsController.scoreTrend);

/**
 * GET /api/trends/list
 * Get list of trending topics with filters
 */
router.get('/list', TrendsController.getTrendingTopics);

/**
 * GET /api/trends
 * Alias for /list
 */
router.get('/', TrendsController.getTrendingTopics);

/**
 * GET /api/trends/:id
 * Get specific trending topic
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const topic = await TrendingTopicModel.getById(id);

    if (!topic) {
      return res.status(404).json({
        error: 'topic_not_found',
        message: 'Trending topic not found'
      });
    }

    res.json({
      success: true,
      trend: topic
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_topic_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/trends/suggest-content
 * Get content suggestions based on trends
 */
router.post('/suggest-content', TrendsController.suggestContent);

/**
 * GET /api/trends/analytics/:trendId
 * Get analytics for a specific trend
 */
router.get('/analytics/:trendId', TrendsController.getAnalytics);

/**
 * GET /api/trends/analytics?summary=true
 * Get performance summary for all trends
 */
router.get('/analytics', TrendsController.getAnalytics);

/**
 * GET /api/trends/category/:category
 * Get trends by category
 */
router.get('/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const trends = await TrendingTopicModel.getByCategory(category, parseInt(limit));

    res.json({
      success: true,
      trends,
      category,
      count: trends.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_category_trends_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trends/platform/:platform
 * Get trends by platform
 */
router.get('/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 20 } = req.query;

    const trends = await TrendingTopicModel.getByPlatform(platform, parseInt(limit));

    res.json({
      success: true,
      trends,
      platform,
      count: trends.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_platform_trends_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/trends/top-viral
 * Get top viral trends
 */
router.get('/top-viral', async (req, res) => {
  try {
    const { limit = 20 } = req.query;

    const trends = await TrendingTopicModel.getTopViral(parseInt(limit));

    res.json({
      success: true,
      trends,
      count: trends.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_top_viral_failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/trends/:id
 * Update trending topic
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updated = await TrendingTopicModel.update(id, updates);

    res.json({
      success: true,
      trend: updated
    });
  } catch (error) {
    res.status(500).json({
      error: 'update_trend_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/trends/:id
 * Delete trending topic
 */
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Note: Your schema doesn't have soft delete for trending_topics
    // So this is a hard delete
    const { error } = await require('../config/supabase').supabaseAdmin
      .from('trending_topics')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    res.json({
      success: true,
      message: 'Trend deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'delete_trend_failed',
      message: error.message
    });
  }
});

module.exports = router;

