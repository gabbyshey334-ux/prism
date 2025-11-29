const router = require('express').Router();
const PostingController = require('../controllers/PostingController');
const PostModel = require('../models/Post');
const { getQueueStatus, cancelPost, getPostJobStatus } = require('../workers/postingWorker');
const { extractAuth } = require('../middleware/extractAuth');

// Apply auth extraction to all routes
router.use(extractAuth);

/**
 * POST /api/posts/create
 * Create post (immediate or scheduled)
 */
router.post('/create', PostingController.createPost);

/**
 * POST /api/posts/schedule
 * Schedule post for future publishing
 */
router.post('/schedule', PostingController.schedulePost);

/**
 * POST /api/posts/publish/:postId
 * Publish post immediately
 */
router.post('/publish/:postId', PostingController.publishPost);

/**
 * GET /api/posts/:postId/status
 * Get post status
 */
router.get('/:postId/status', PostingController.getPostStatus);

/**
 * PUT /api/posts/:postId
 * Update post
 */
router.put('/:postId', PostingController.updatePost);

/**
 * DELETE /api/posts/:postId
 * Delete post
 */
router.delete('/:postId', PostingController.deletePost);

/**
 * GET /api/posts
 * List posts with filters
 */
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const {
      content_id,
      platform,
      status,
      brand_id,
      start_date,
      end_date,
      limit = 50,
      offset = 0
    } = req.query;

    // Get posts with basic filters
    const posts = await PostModel.getPosts({
      content_id: content_id || undefined,
      platform: platform || undefined,
      status: status || undefined,
      start_date: start_date || undefined,
      end_date: end_date || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset),
      order_by: 'created_at',
      ascending: false
    });

    // Filter by user_id and brand_id by checking content
    const filteredPosts = [];
    for (const post of posts) {
      try {
        const content = await ContentModel.getById(post.content_id);
        if (!content) continue;
        
        if (userId && content.user_id !== userId) continue;
        if (brand_id && content.brand_id !== brand_id) continue;
        
        filteredPosts.push(post);
      } catch (error) {
        // Skip posts with invalid content
        continue;
      }
    }

    res.json({
      success: true,
      posts: filteredPosts,
      count: filteredPosts.length,
      filters: {
        content_id,
        platform,
        status,
        brand_id,
        start_date,
        end_date,
        limit,
        offset
      }
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_posts_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/scheduled
 * Get scheduled posts
 */
router.get('/scheduled', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { limit = 50 } = req.query;

    const posts = await PostModel.getScheduled({
      user_id: userId,
      limit: parseInt(limit)
    });

    res.json({
      success: true,
      posts,
      count: posts.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_scheduled_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/calendar
 * Get posts for calendar view
 */
router.get('/calendar', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({
        error: 'dates_required',
        message: 'start_date and end_date are required'
      });
    }

    const posts = await PostModel.getCalendarPosts(start_date, end_date, userId);

    res.json({
      success: true,
      posts,
      count: posts.length,
      start_date,
      end_date
    });
  } catch (error) {
    res.status(500).json({
      error: 'calendar_fetch_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/queue/status
 * Get queue status
 */
router.get('/queue/status', async (req, res) => {
  try {
    const status = await getQueueStatus();
    res.json({
      success: true,
      queue: status
    });
  } catch (error) {
    res.status(500).json({
      error: 'queue_status_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/jobs/:jobId
 * Get job status
 */
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const status = await getPostJobStatus(jobId);
    res.json(status);
  } catch (error) {
    res.status(500).json({
      error: 'job_status_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/posts/jobs/:jobId
 * Cancel scheduled post job
 */
router.delete('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const success = await cancelPost(jobId);
    
    if (success) {
      res.json({
        success: true,
        message: 'Post job cancelled successfully'
      });
    } else {
      res.status(404).json({
        error: 'job_not_found',
        message: 'Job not found or already processed'
      });
    }
  } catch (error) {
    res.status(500).json({
      error: 'cancel_job_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/posts/analytics
 * Get posting analytics
 */
router.get('/analytics', PostingController.getAnalytics);

/**
 * GET /api/posts/best-times
 * Get best times to post
 */
router.get('/best-times', PostingController.getBestTimes);

module.exports = router;

