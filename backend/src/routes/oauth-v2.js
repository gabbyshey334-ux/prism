const router = require('express').Router();
const OAuthController = require('../controllers/OAuthController');
const SocialMediaConnection = require('../models/SocialMediaConnection');
const { extractAuth } = require('../middleware/extractAuth');

// Apply auth extraction to all routes
router.use(extractAuth);

/**
 * POST /api/oauth/connect
 * Initiate OAuth connection flow
 * Body: { platform: string, brandId?: string }
 */
router.post('/connect', OAuthController.connect);

/**
 * GET /api/oauth/:platform/callback
 * Handle OAuth callback from platform
 * Query: { code: string, state: string, error?: string }
 */
router.get('/:platform/callback', OAuthController.callback);


/**
 * GET /api/oauth/connections/:brandId
 * Get all connections for a brand
 */
router.get('/connections/:brandId', async (req, res) => {
  try {
    const { brandId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'User authentication required'
      });
    }

    const connections = await SocialMediaConnection.getByBrandId(brandId);

    res.json({
      success: true,
      connections,
      count: connections.length
    });
  } catch (error) {
    console.error('Get connections error:', error);
    res.status(500).json({
      error: 'fetch_connections_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/oauth/connections/:connectionId
 * Delete a connection
 */
router.delete('/connections/:connectionId', async (req, res) => {
  try {
    const { connectionId } = req.params;
    const userId = req.user?.uid;

    if (!userId) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'User authentication required'
      });
    }

    // Verify connection belongs to user
    const connection = await SocialMediaConnection.getById(connectionId);
    if (!connection) {
      return res.status(404).json({
        error: 'connection_not_found',
        message: 'Connection not found'
      });
    }

    if (connection.user_id !== userId) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have permission to delete this connection'
      });
    }

    await SocialMediaConnection.delete(connectionId);

    res.json({
      success: true,
      message: 'Connection deleted successfully'
    });
  } catch (error) {
    console.error('Delete connection error:', error);
    res.status(500).json({
      error: 'delete_connection_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/oauth/platforms
 * Get list of supported platforms
 */
router.get('/platforms', (req, res) => {
  res.json({
    success: true,
    platforms: [
      {
        id: 'tiktok',
        name: 'TikTok',
        enabled: !!process.env.TIKTOK_CLIENT_KEY
      },
      {
        id: 'facebook',
        name: 'Facebook',
        enabled: !!process.env.FACEBOOK_APP_ID
      },
      {
        id: 'instagram',
        name: 'Instagram',
        enabled: !!(process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID)
      },
      {
        id: 'linkedin',
        name: 'LinkedIn',
        enabled: !!process.env.LINKEDIN_CLIENT_ID
      },
      {
        id: 'youtube',
        name: 'YouTube',
        enabled: !!process.env.GOOGLE_CLIENT_ID
      },
      {
        id: 'twitter',
        name: 'Twitter',
        enabled: !!process.env.TWITTER_CLIENT_ID
      },
      {
        id: 'threads',
        name: 'Threads',
        enabled: !!(process.env.THREADS_CLIENT_ID || process.env.FACEBOOK_APP_ID)
      }
    ]
  });
});

module.exports = router;

