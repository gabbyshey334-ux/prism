const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')
const { extractAuth } = require('../middleware/extractAuth')

// Apply auth extraction to all routes
router.use(extractAuth)

// Get CE.SDK license key - supports both GET and POST
router.get('/getCESDKKey', async (req, res) => {
  try {
    const licenseKey = process.env.CESDK_LICENSE_KEY
    
    if (!licenseKey) {
      return res.status(500).json({
        error: 'license_key_not_configured',
        message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY environment variable.'
      })
    }

    return res.json({
      apiKey: licenseKey,
      success: true
    })
  } catch (e) {
    console.error('getCESDKKey error:', e)
    return res.status(500).json({
      error: 'license_key_fetch_failed',
      message: e.message
    })
  }
})

router.post('/getCESDKKey', async (req, res) => {
  try {
    const licenseKey = process.env.CESDK_LICENSE_KEY
    
    if (!licenseKey) {
      return res.status(500).json({
        error: 'license_key_not_configured',
        message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY environment variable.'
      })
    }

    return res.json({
      apiKey: licenseKey,
      success: true
    })
  } catch (e) {
    console.error('getCESDKKey error:', e)
    return res.status(500).json({
      error: 'license_key_fetch_failed',
      message: e.message
    })
  }
})

// Social media callback handler
router.post('/socialMediaCallback', async (req, res) => {
  try {
    const { state, code, platform } = req.body || {}
    
    // Extract platform from state if not provided
    let detectedPlatform = platform
    if (!detectedPlatform && state) {
      const platMatch = String(state).match(/platform-([a-zA-Z0-9_\-]+)/)
      detectedPlatform = platMatch ? platMatch[1] : 'unknown'
    }

    return res.json({
      success: true,
      platform: detectedPlatform || 'unknown',
      account_name: 'connected_account'
    })
  } catch (e) {
    console.error('socialMediaCallback error:', e)
    return res.status(500).json({
      error: 'callback_processing_failed',
      message: e.message
    })
  }
})

// Social media connect (redirects to OAuth)
router.post('/socialMediaConnect', async (req, res) => {
  try {
    const { platform } = req.body || {}
    
    if (!platform) {
      return res.status(400).json({
        error: 'platform_required',
        message: 'Platform parameter is required'
      })
    }

    // Redirect to OAuth endpoint
    const backendUrl = process.env.BACKEND_URL || process.env.API_URL || ''
    const authUrl = backendUrl ? `${backendUrl}/api/oauth/${platform}` : `/api/oauth/${platform}`
    return res.json({ authUrl, platform })
  } catch (e) {
    console.error('socialMediaConnect error:', e)
    return res.status(500).json({
      error: 'connect_failed',
      message: e.message
    })
  }
})

// Social media post
router.post('/socialMediaPost', async (req, res) => {
  try {
    const { platform, content } = req.body || {}
    
    if (!platform || !content) {
      return res.status(400).json({
        error: 'missing_parameters',
        message: 'Platform and content are required'
      })
    }

    // This should use the social_posting route
    // For now, return a redirect to the proper endpoint
    return res.json({
      redirect: `/api/social/publish`,
      message: 'Use /api/social/publish endpoint for posting'
    })
  } catch (e) {
    console.error('socialMediaPost error:', e)
    return res.status(500).json({
      error: 'post_failed',
      message: e.message
    })
  }
})

// Refresh social media token
router.post('/socialMediaRefreshToken', async (req, res) => {
  try {
    const { platform } = req.body || {}
    
    if (!platform) {
      return res.status(400).json({
        error: 'platform_required',
        message: 'Platform parameter is required'
      })
    }

    // This should use the social route refresh endpoint
    return res.json({
      redirect: `/api/social/refresh`,
      message: 'Use /api/social/refresh endpoint for token refresh'
    })
  } catch (e) {
    console.error('socialMediaRefreshToken error:', e)
    return res.status(500).json({
      error: 'refresh_failed',
      message: e.message
    })
  }
})

// Generic function invoker - handles direct function calls
router.post('/invoke/:name', async (req, res) => {
  try {
    const { name } = req.params
    const payload = req.body || {}
    
    if (!name) {
      return res.status(400).json({
        error: 'function_name_required',
        message: 'Function name is required'
      })
    }

    // Route to appropriate handler based on function name
    switch (name) {
      case 'getCESDKKey': {
        const licenseKey = process.env.CESDK_LICENSE_KEY
        if (!licenseKey) {
          return res.status(500).json({
            error: 'license_key_not_configured',
            message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY environment variable.'
          })
        }
        return res.json({ apiKey: licenseKey, success: true })
      }
      
      case 'socialMediaCallback': {
        const { state, code, platform } = payload
        let detectedPlatform = platform
        if (!detectedPlatform && state) {
          const platMatch = String(state).match(/platform-([a-zA-Z0-9_\-]+)/)
          detectedPlatform = platMatch ? platMatch[1] : 'unknown'
        }
        return res.json({
          success: true,
          platform: detectedPlatform || 'unknown',
          account_name: 'connected_account'
        })
      }
      
      case 'socialMediaConnect': {
        const { platform } = payload
        if (!platform) {
          return res.status(400).json({
            error: 'platform_required',
            message: 'Platform parameter is required'
          })
        }
        {
          const backendUrl = process.env.BACKEND_URL || process.env.API_URL || ''
          const authUrl = backendUrl ? `${backendUrl}/api/oauth/${platform}` : `/api/oauth/${platform}`
          return res.json({ authUrl, platform })
        }
      }
      
      case 'socialMediaPost': {
        const { platform, content } = payload
        if (!platform || !content) {
          return res.status(400).json({
            error: 'missing_parameters',
            message: 'Platform and content are required'
          })
        }
        return res.json({
          redirect: `/api/social/publish`,
          message: 'Use /api/social/publish endpoint for posting'
        })
      }
      
      case 'socialMediaRefreshToken': {
        const { platform } = payload
        if (!platform) {
          return res.status(400).json({
            error: 'platform_required',
            message: 'Platform parameter is required'
          })
        }
        return res.json({
          redirect: `/api/social/refresh`,
          message: 'Use /api/social/refresh endpoint for token refresh'
        })
      }
      
      default:
        return res.status(404).json({
          error: 'function_not_found',
          message: `Function ${name} is not implemented`
        })
    }
  } catch (e) {
    console.error('Function invoke error:', e)
    return res.status(500).json({
      error: 'function_invoke_failed',
      message: e.message
    })
  }
})

module.exports = router
