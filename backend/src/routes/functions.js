const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')
const { extractAuth } = require('../middleware/extractAuth')
const { v4: uuidv4 } = require('uuid')
const axios = require('axios')
const { v5: uuidv5 } = require('uuid')

// UUID namespace for consistent Firebase ID -> UUID conversion
const FIREBASE_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

// Helper function to convert Firebase Auth ID to UUID
const firebaseIdToUuid = (firebaseId) => {
  if (!firebaseId) return null
  return uuidv5(firebaseId, FIREBASE_NAMESPACE)
}

// Supabase Storage bucket name
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'files'

// Apply auth extraction to all routes
router.use(extractAuth)

// Get CE.SDK license key - supports both GET and POST
// Base44 compatible: Also checks CESDK_API_KEY environment variable
router.get('/getCESDKKey', async (req, res) => {
  try {
    console.log('[CE.SDK] License key request received');
    const licenseKey = process.env.CESDK_LICENSE_KEY || process.env.CESDK_API_KEY
    
    if (!licenseKey) {
      console.error('[CE.SDK] License key not configured');
      return res.status(500).json({
        error: 'license_key_not_configured',
        message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY or CESDK_API_KEY environment variable.'
      })
    }

    // Validate license key format (basic check)
    if (licenseKey.length < 10) {
      console.warn('[CE.SDK] License key seems too short, may be invalid');
    }

    console.log('[CE.SDK] License key provided successfully');
    return res.json({
      apiKey: licenseKey,
      success: true
    })
  } catch (e) {
    console.error('[CE.SDK] License key fetch error:', e)
    return res.status(500).json({
      error: 'license_key_fetch_failed',
      message: e.message
    })
  }
})

router.post('/getCESDKKey', async (req, res) => {
  try {
    console.log('[CE.SDK] License key request received (POST)');
    const licenseKey = process.env.CESDK_LICENSE_KEY || process.env.CESDK_API_KEY
    
    if (!licenseKey) {
      console.error('[CE.SDK] License key not configured');
      return res.status(500).json({
        error: 'license_key_not_configured',
        message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY or CESDK_API_KEY environment variable.'
      })
    }

    // Validate license key format (basic check)
    if (licenseKey.length < 10) {
      console.warn('[CE.SDK] License key seems too short, may be invalid');
    }

    console.log('[CE.SDK] License key provided successfully (POST)');
    return res.json({
      apiKey: licenseKey,
      success: true
    })
  } catch (e) {
    console.error('[CE.SDK] License key fetch error (POST):', e)
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
    const authBase = backendUrl ? `${backendUrl}/api/oauth/${platform}` : `/api/oauth/${platform}`
    const token = req.headers.authorization?.replace('Bearer ', '')
    const authUrl = token ? `${authBase}?token=${encodeURIComponent(token)}` : authBase
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

// Base44 migrated function: Apply content to template
router.post('/applyContentToTemplate', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { templateScene, placeholders, contentValues, placeholderMapping } = req.body || {}

    console.log('Applying content to template...')
    console.log('Template scene type:', typeof templateScene)
    console.log('Template scene (first 100 chars):', 
      typeof templateScene === 'string' ? templateScene.substring(0, 100) : 'Not a string')
    console.log('Placeholders:', placeholders?.length || 0)
    console.log('Content values:', contentValues)
    console.log('Placeholder mapping:', placeholderMapping)

    if (!templateScene) {
      return res.status(400).json({ 
        error: 'No template scene provided' 
      })
    }

    if (!placeholders || placeholders.length === 0) {
      return res.status(400).json({ 
        error: 'No placeholders provided' 
      })
    }

    // For CE.SDK scenes, we can't easily modify the binary format
    // Instead, we'll return the scene as-is and let CE.SDK handle it
    // The contentValues will be applied via CE.SDK's variable system in the editor
    
    // Just return success - the editor will apply content via variables
    return res.json({
      success: true,
      scene: templateScene, // Return scene as-is
      note: 'Content will be applied via CE.SDK variables in editor'
    })

  } catch (error) {
    console.error('Apply content to template error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to apply content to template',
      details: error.stack
    })
  }
})

// Base44 migrated function: Add image block to scene
router.post('/addImageBlock', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, imageUrl, x = 0, y = 0, width = 500, height = 500 } = req.body || {}

    // Create image block
    const imageBlock = {
      "type": "//ly.img.ubq/image",
      "id": uuidv4(),
      "position": { "x": x, "y": y },
      "width": width,
      "height": height,
      "fill": {
        "type": "//ly.img.ubq/fill/image",
        "imageFileURI": imageUrl
      }
    }

    // Add to scene
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      updatedScene.pages[0].blocks = [
        ...(updatedScene.pages[0].blocks || []),
        imageBlock
      ]
    }

    return res.json({
      success: true,
      scene: updatedScene,
      blockId: imageBlock.id
    })

  } catch (error) {
    console.error('Add image block error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to add image block'
    })
  }
})

// Base44 migrated function: Add shape block to scene
router.post('/addShapeBlock', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { 
      scene, 
      shapeType = 'rectangle',
      x = 100, 
      y = 100, 
      width = 200, 
      height = 200,
      fillColor = '#3D3D2B',
      opacity = 1,
      cornerRadius = 0
    } = req.body || {}

    // Convert hex color to RGBA
    const hexToRgba = (hex, alpha = 1) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return { r, g, b, a: alpha }
    }

    let shapeBlock

    if (shapeType === 'rectangle') {
      shapeBlock = {
        "type": "//ly.img.ubq/shape/rect",
        "id": uuidv4(),
        "position": { "x": x, "y": y },
        "width": width,
        "height": height,
        "cornerRadius": cornerRadius,
        "fill": {
          "type": "//ly.img.ubq/fill/color",
          "color": hexToRgba(fillColor, opacity)
        }
      }
    } else if (shapeType === 'circle' || shapeType === 'ellipse') {
      shapeBlock = {
        "type": "//ly.img.ubq/shape/ellipse",
        "id": uuidv4(),
        "position": { "x": x, "y": y },
        "width": width,
        "height": height,
        "fill": {
          "type": "//ly.img.ubq/fill/color",
          "color": hexToRgba(fillColor, opacity)
        }
      }
    }

    // Add to scene
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      updatedScene.pages[0].blocks = [
        ...(updatedScene.pages[0].blocks || []),
        shapeBlock
      ]
    }

    return res.json({
      success: true,
      scene: updatedScene,
      blockId: shapeBlock.id
    })

  } catch (error) {
    console.error('Add shape block error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to add shape block'
    })
  }
})

// Base44 migrated function: Add text block to scene
router.post('/addTextBlock', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, text, x = 100, y = 100, fontSize = 48, color = '#000000' } = req.body || {}

    // Convert hex color to RGBA
    const hexToRgba = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return { r, g, b, a: 1 }
    }

    // Create text block
    const textBlock = {
      "type": "//ly.img.ubq/text",
      "id": uuidv4(),
      "position": { "x": x, "y": y },
      "text": text,
      "fontSize": fontSize,
      "fill": {
        "type": "//ly.img.ubq/fill/color",
        "color": hexToRgba(color)
      }
    }

    // Add to scene
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      updatedScene.pages[0].blocks = [
        ...(updatedScene.pages[0].blocks || []),
        textBlock
      ]
    }

    return res.json({
      success: true,
      scene: updatedScene,
      blockId: textBlock.id
    })

  } catch (error) {
    console.error('Add text block error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to add text block'
    })
  }
})

// Base44 migrated function: Change background color
router.post('/changeBackground', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, color = '#FFFFFF' } = req.body || {}

    // Convert hex color to RGBA
    const hexToRgba = (hex) => {
      const r = parseInt(hex.slice(1, 3), 16) / 255
      const g = parseInt(hex.slice(3, 5), 16) / 255
      const b = parseInt(hex.slice(5, 7), 16) / 255
      return { r, g, b, a: 1 }
    }

    // Update background
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      updatedScene.pages[0].fill = {
        "type": "//ly.img.ubq/fill/color",
        "color": hexToRgba(color)
      }
    }

    return res.json({
      success: true,
      scene: updatedScene
    })

  } catch (error) {
    console.error('Change background error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to change background'
    })
  }
})

// Base44 migrated function: Create design
router.post('/createDesign', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { format, templateScene } = req.body || {}

    // Format dimensions mapping
    const formatDimensions = {
      instagram_square: { width: 1080, height: 1080 },
      instagram_portrait: { width: 1080, height: 1350 },
      instagram_story: { width: 1080, height: 1920 },
      tiktok_vertical: { width: 1080, height: 1920 },
      youtube_thumbnail: { width: 1280, height: 720 },
      twitter_header: { width: 1500, height: 500 },
      custom: { width: 1080, height: 1080 }
    }

    const dimensions = formatDimensions[format] || formatDimensions.instagram_square

    // Create scene structure
    const scene = templateScene || {
      "version": "1.0",
      "type": "//ly.img.ubq/scene",
      "id": uuidv4(),
      "metadata": {
        "name": "New Design"
      },
      "pages": [
        {
          "type": "//ly.img.ubq/page",
          "id": uuidv4(),
          "width": dimensions.width,
          "height": dimensions.height,
          "fill": {
            "type": "//ly.img.ubq/fill/color",
            "color": { "r": 1, "g": 1, "b": 1, "a": 1 }
          },
          "blocks": []
        }
      ]
    }

    return res.json({
      success: true,
      scene: scene,
      sceneId: scene.id
    })

  } catch (error) {
    console.error('Create design error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to create design'
    })
  }
})

// Base44 migrated function: Delete block from scene
router.post('/deleteBlock', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, blockId } = req.body || {}

    // Remove block from scene
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      updatedScene.pages[0].blocks = updatedScene.pages[0].blocks.filter(
        block => block.id !== blockId
      )
    }

    return res.json({
      success: true,
      scene: updatedScene
    })

  } catch (error) {
    console.error('Delete block error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to delete block'
    })
  }
})

// Base44 migrated function: Extract blocks from scene
router.post('/extractBlocks', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene } = req.body || {}

    console.log('=== EXTRACTING BLOCKS ===')

    let sceneString = scene

    // Handle base64 encoded scenes (UBQ1 prefix)
    if (typeof scene === 'string' && scene.startsWith('UBQ1')) {
      const base64Content = scene.substring(4)
      // Use Buffer instead of atob for Node.js
      sceneString = Buffer.from(base64Content, 'base64').toString('utf-8')
    }

    let sceneData
    try {
      // If sceneString is already an object, use it directly
      if (typeof sceneString === 'object') {
        sceneData = sceneString
      } else {
        sceneData = JSON.parse(sceneString)
      }
      console.log('Parsed JSON successfully')
    } catch (e) {
      return res.status(400).json({ 
        error: 'Failed to parse scene',
        details: e.message
      })
    }

    const blocks = []
    
    if (sceneData.hierarchy && sceneData.hierarchy.children && Array.isArray(sceneData.hierarchy.children)) {
      console.log(`Found ${sceneData.hierarchy.children.length} children in hierarchy`)
      
      if (sceneData.designElements && Array.isArray(sceneData.designElements)) {
        console.log(`Found ${sceneData.designElements.length} design elements`)
        
        // Create a map of entity IDs to design elements
        const elementMap = new Map()
        for (const element of sceneData.designElements) {
          if (element.entity !== undefined) {
            elementMap.set(element.entity, element)
          }
        }
        
        console.log(`Created element map with ${elementMap.size} entries`)
        
        // Process each child from hierarchy (children are objects with {key, value})
        for (const child of sceneData.hierarchy.children) {
          const entityId = child.key // Extract the key property
          const element = elementMap.get(entityId)
          
          if (element) {
            const blockId = element.uuid || element.entity
            const blockType = element.id || ''
            const blockName = element.block_common?.name || ''
            
            console.log(`Block ${blockId}: type=${blockType}, name=${blockName}`)
            
            // Determine if it's a text or image block
            const isText = blockType.includes('text') || blockType.includes('Text')
            const isImage = blockType.includes('image') || blockType.includes('Image') || 
                           blockType.includes('graphic') || blockType.includes('Graphic')
            
            if (isText || isImage) {
              console.log(`  ✓ Adding ${isText ? 'text' : 'image'} block`)
              blocks.push({
                id: String(blockId),
                block_id: String(blockId),
                name: blockName || String(blockId),
                type: isText ? 'text' : 'image',
                label: blockName || `${isText ? 'Text' : 'Image'} Block`,
                preview: `${isText ? 'Text' : 'Image'}: ${blockName || String(blockId).substring(0, 20)}`
              })
            } else {
              console.log(`  → Skipping type: ${blockType}`)
            }
          } else {
            console.log(`  ⚠️ Entity ${entityId} not found in designElements`)
          }
        }
      } else {
        console.log('⚠️ No designElements array found')
      }
    } else {
      console.log('⚠️ No hierarchy.children array found')
    }
    
    console.log('=== EXTRACTION COMPLETE ===')
    console.log(`Blocks found: ${blocks.length}`)

    return res.json({
      success: true,
      blocks: blocks
    })

  } catch (error) {
    console.error('Extract error:', error)
    return res.status(500).json({ 
      error: error.message,
      details: error.stack
    })
  }
})

// Base44 migrated function: Get CE.SDK templates
router.get('/getCESDKTemplates', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const CESDK_API_KEY = process.env.CESDK_API_KEY || process.env.CESDK_LICENSE_KEY

    if (!CESDK_API_KEY) {
      return res.status(500).json({ 
        error: 'CE.SDK API key not configured' 
      })
    }

    // Fetch CE.SDK templates from their API
    try {
      const response = await axios.get('https://api.img.ly/v1/templates', {
        headers: {
          'Authorization': `Bearer ${CESDK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      return res.json({
        success: true,
        templates: response.data.templates || []
      })
    } catch (apiError) {
      // If API call fails, return sample templates
      console.warn('CE.SDK API call failed, returning sample templates:', apiError.message)
      return res.json({
        success: true,
        templates: [
          {
            id: 'cesdk-social-post-1',
            name: 'Modern Social Post',
            category: 'social',
            format: 'instagram_square',
            thumbnail: 'https://img.ly/static/cesdk-templates/social-1.jpg',
            description: 'Clean and modern social media post template'
          },
          {
            id: 'cesdk-story-1',
            name: 'Story Template',
            category: 'story',
            format: 'instagram_story',
            thumbnail: 'https://img.ly/static/cesdk-templates/story-1.jpg',
            description: 'Engaging story template with text overlays'
          }
        ]
      })
    }

  } catch (error) {
    console.error('Get CE.SDK templates error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch templates',
      success: false,
      templates: []
    })
  }
})

// Also support POST for consistency
router.post('/getCESDKTemplates', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const CESDK_API_KEY = process.env.CESDK_API_KEY || process.env.CESDK_LICENSE_KEY

    if (!CESDK_API_KEY) {
      return res.status(500).json({ 
        error: 'CE.SDK API key not configured' 
      })
    }

    // Fetch CE.SDK templates from their API
    try {
      const response = await axios.get('https://api.img.ly/v1/templates', {
        headers: {
          'Authorization': `Bearer ${CESDK_API_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      return res.json({
        success: true,
        templates: response.data.templates || []
      })
    } catch (apiError) {
      // If API call fails, return sample templates
      console.warn('CE.SDK API call failed, returning sample templates:', apiError.message)
      return res.json({
        success: true,
        templates: [
          {
            id: 'cesdk-social-post-1',
            name: 'Modern Social Post',
            category: 'social',
            format: 'instagram_square',
            thumbnail: 'https://img.ly/static/cesdk-templates/social-1.jpg',
            description: 'Clean and modern social media post template'
          },
          {
            id: 'cesdk-story-1',
            name: 'Story Template',
            category: 'story',
            format: 'instagram_story',
            thumbnail: 'https://img.ly/static/cesdk-templates/story-1.jpg',
            description: 'Engaging story template with text overlays'
          }
        ]
      })
    }

  } catch (error) {
    console.error('Get CE.SDK templates error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to fetch templates',
      success: false,
      templates: []
    })
  }
})

// Base44 migrated function: Inspect scene
router.post('/inspectScene', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene } = req.body || {}

    console.log('Inspecting CE.SDK scene...')
    console.log('Scene type:', typeof scene)

    // Handle string scenes
    if (typeof scene !== 'string') {
      return res.status(400).json({ 
        error: 'Scene must be a string' 
      })
    }

    console.log('Scene starts with:', scene.substring(0, 50))

    let decodedScene = scene
    
    // Decode if base64
    if (scene.startsWith('UBQ1')) {
      try {
        const base64Content = scene.substring(4)
        decodedScene = Buffer.from(base64Content, 'base64').toString('utf-8')
        console.log('Successfully decoded base64')
      } catch (e) {
        console.error('Failed to decode:', e)
        return res.status(400).json({ error: 'Failed to decode scene' })
      }
    }

    // Just dump the first 10000 characters of the DECODED scene for inspection
    const preview = decodedScene.substring(0, 10000)
    
    // Try to find all occurrences of "variable" in the decoded scene
    const variableOccurrences = []
    const regex = /"[^"]*variable[^"]*"[^}]{0,200}/gi
    const matches = decodedScene.matchAll(regex)
    
    for (const match of matches) {
      variableOccurrences.push(match[0])
    }

    // Also look for placeholder patterns
    const placeholderOccurrences = []
    const placeholderRegex = /"placeholder[^}]{0,200}/gi
    const placeholderMatches = decodedScene.matchAll(placeholderRegex)
    
    for (const match of placeholderMatches) {
      placeholderOccurrences.push(match[0])
    }

    return res.json({
      success: true,
      scenePreview: preview,
      variableOccurrences: variableOccurrences.slice(0, 30),
      placeholderOccurrences: placeholderOccurrences.slice(0, 30),
      sceneLength: decodedScene.length,
      wasBase64: scene.startsWith('UBQ1')
    })

  } catch (error) {
    console.error('Inspect scene error:', error)
    return res.status(500).json({ 
      error: error.message,
      details: error.stack
    })
  }
})

// Base44 migrated function: Move block in layer order
router.post('/moveBlock', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, blockId, direction } = req.body || {}

    // Move block in layer order
    const updatedScene = { ...scene }
    if (updatedScene.pages && updatedScene.pages[0]) {
      const blocks = [...updatedScene.pages[0].blocks]
      const index = blocks.findIndex(b => b.id === blockId)
      
      if (index === -1) {
        return res.status(404).json({ error: 'Block not found' })
      }

      if (direction === 'up' && index > 0) {
        // Swap with previous element (move forward in layer)
        [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]]
      } else if (direction === 'down' && index < blocks.length - 1) {
        // Swap with next element (move backward in layer)
        [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]
      }

      updatedScene.pages[0].blocks = blocks
    }

    return res.json({
      success: true,
      scene: updatedScene
    })

  } catch (error) {
    console.error('Move block error:', error)
    return res.status(500).json({ 
      error: error.message || 'Failed to move block'
    })
  }
})

// Base44 migrated function: Render design
router.post('/renderDesign', async (req, res) => {
  try {
    // Auth check (equivalent to base44.auth.me())
    // extractAuth middleware already sets req.user
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' })
    }

    const { scene, exportFormat = 'png' } = req.body || {}

    const CESDK_API_URL = 'https://api.img.ly/v1/renders'
    const CESDK_API_KEY = process.env.CESDK_API_KEY || process.env.CESDK_LICENSE_KEY

    if (!CESDK_API_KEY) {
      return res.status(500).json({ 
        error: 'CE.SDK API key not configured. Please set CESDK_API_KEY in environment variables.' 
      })
    }

    console.log('Processing scene data...')

    // Handle scene data - could be base64 string, JSON object, or JSON string
    let sceneData = scene
    if (typeof scene === 'string') {
      // Try to decode if it's base64
      try {
        if (scene.startsWith('UBQ1')) {
          const base64Content = scene.substring(4)
          const decoded = Buffer.from(base64Content, 'base64').toString('utf-8')
          sceneData = JSON.parse(decoded)
          console.log('Decoded base64 scene successfully')
        } else {
          // Try to parse as JSON directly
          sceneData = JSON.parse(scene)
          console.log('Parsed JSON scene successfully')
        }
      } catch {
        // If both fail, pass as is
        console.log('Using scene string as-is')
        sceneData = scene
      }
    }

    console.log('Rendering scene with CE.SDK API...')

    // Call CE.SDK REST API
    const response = await axios.post(CESDK_API_URL, {
      scene: sceneData,
      export: {
        format: exportFormat,
        jpegQuality: 0.95,
        pngCompressionLevel: 6
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CESDK_API_KEY}`
      },
      responseType: 'arraybuffer' // Get binary data
    })

    if (response.status !== 200) {
      const errorData = response.data ? Buffer.from(response.data).toString('utf-8') : 'Unknown error'
      console.error('CE.SDK API error:', errorData)
      return res.status(response.status).json({ 
        error: 'Failed to render design with CE.SDK API',
        details: errorData
      })
    }

    console.log('Rendering successful, uploading image...')

    // Get the rendered image buffer
    const imageBuffer = Buffer.from(response.data)
    
    // Get user ID
    const firebaseUserId = req.user?.uid
    if (!firebaseUserId) {
      return res.status(401).json({ error: 'User ID not found' })
    }

    // Generate unique file path
    const timestamp = Date.now()
    const randomString = Math.random().toString(36).substring(7)
    const fileName = `design_${timestamp}_${randomString}.${exportFormat}`
    const filePath = `uploads/${firebaseUserId}/${fileName}`

    // Determine MIME type
    const mimeType = exportFormat === 'png' ? 'image/png' : 
                     exportFormat === 'jpg' || exportFormat === 'jpeg' ? 'image/jpeg' : 
                     `image/${exportFormat}`

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .upload(filePath, imageBuffer, {
        contentType: mimeType,
        cacheControl: '3600',
        upsert: false,
        metadata: {
          originalName: fileName,
          uploadedAt: new Date().toISOString(),
          userId: firebaseUserId,
          rendered: true
        }
      })

    if (uploadError) {
      console.error('❌ Supabase storage upload error:', uploadError)
      return res.status(500).json({
        error: 'storage_upload_failed',
        message: uploadError.message || 'Failed to upload rendered image'
      })
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(filePath)

    const publicUrl = urlData.publicUrl

    console.log('Upload successful:', publicUrl)

    // Create metadata record in uploads table
    const userId = firebaseIdToUuid(firebaseUserId)
    const uploadRecord = {
      user_id: userId,
      file_name: fileName,
      file_url: publicUrl,
      file_type: 'image',
      mime_type: mimeType,
      file_size: imageBuffer.length,
      storage_path: filePath,
      metadata: {
        original_name: fileName,
        uploaded_at: new Date().toISOString(),
        content_type: mimeType,
        firebase_user_id: firebaseUserId,
        rendered: true,
        export_format: exportFormat
      }
    }

    // Insert upload record (don't fail if this fails)
    try {
      await supabaseAdmin.from('uploads').insert(uploadRecord)
    } catch (dbError) {
      console.warn('Failed to create upload record (non-critical):', dbError.message)
    }

    return res.json({
      success: true,
      imageUrl: publicUrl,
      format: exportFormat
    })

  } catch (error) {
    console.error('Render design error:', error)
    
    // Handle axios errors
    if (error.response) {
      const errorData = error.response.data ? 
        (Buffer.isBuffer(error.response.data) ? 
          Buffer.from(error.response.data).toString('utf-8') : 
          error.response.data) : 
        'Unknown error'
      return res.status(error.response.status).json({ 
        error: 'Failed to render design with CE.SDK API',
        details: errorData
      })
    }

    return res.status(500).json({ 
      error: error.message || 'Failed to render design',
      details: error.stack
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
        // Base44 compatible: Also checks CESDK_API_KEY environment variable
        const licenseKey = process.env.CESDK_LICENSE_KEY || process.env.CESDK_API_KEY
        if (!licenseKey) {
          return res.status(500).json({
            error: 'license_key_not_configured',
            message: 'CE.SDK license key is not configured. Please set CESDK_LICENSE_KEY or CESDK_API_KEY environment variable.'
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
          const authBase = backendUrl ? `${backendUrl}/api/oauth/${platform}` : `/api/oauth/${platform}`
          const token = req.headers.authorization?.replace('Bearer ', '')
          const authUrl = token ? `${authBase}?token=${encodeURIComponent(token)}` : authBase
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
      
      case 'applyContentToTemplate': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { templateScene, placeholders, contentValues, placeholderMapping } = payload

        console.log('Applying content to template...')
        console.log('Template scene type:', typeof templateScene)
        console.log('Template scene (first 100 chars):', 
          typeof templateScene === 'string' ? templateScene.substring(0, 100) : 'Not a string')
        console.log('Placeholders:', placeholders?.length || 0)
        console.log('Content values:', contentValues)
        console.log('Placeholder mapping:', placeholderMapping)

        if (!templateScene) {
          return res.status(400).json({ 
            error: 'No template scene provided' 
          })
        }

        if (!placeholders || placeholders.length === 0) {
          return res.status(400).json({ 
            error: 'No placeholders provided' 
          })
        }

        // For CE.SDK scenes, we can't easily modify the binary format
        // Instead, we'll return the scene as-is and let CE.SDK handle it
        // The contentValues will be applied via CE.SDK's variable system in the editor
        
        // Just return success - the editor will apply content via variables
        return res.json({
          success: true,
          scene: templateScene, // Return scene as-is
          note: 'Content will be applied via CE.SDK variables in editor'
        })
      }
      
      case 'addImageBlock': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, imageUrl, x = 0, y = 0, width = 500, height = 500 } = payload

        // Create image block
        const imageBlock = {
          "type": "//ly.img.ubq/image",
          "id": uuidv4(),
          "position": { "x": x, "y": y },
          "width": width,
          "height": height,
          "fill": {
            "type": "//ly.img.ubq/fill/image",
            "imageFileURI": imageUrl
          }
        }

        // Add to scene
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          updatedScene.pages[0].blocks = [
            ...(updatedScene.pages[0].blocks || []),
            imageBlock
          ]
        }

        return res.json({
          success: true,
          scene: updatedScene,
          blockId: imageBlock.id
        })
      }
      
      case 'addShapeBlock': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { 
          scene, 
          shapeType = 'rectangle',
          x = 100, 
          y = 100, 
          width = 200, 
          height = 200,
          fillColor = '#3D3D2B',
          opacity = 1,
          cornerRadius = 0
        } = payload

        // Convert hex color to RGBA
        const hexToRgba = (hex, alpha = 1) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255
          const g = parseInt(hex.slice(3, 5), 16) / 255
          const b = parseInt(hex.slice(5, 7), 16) / 255
          return { r, g, b, a: alpha }
        }

        let shapeBlock

        if (shapeType === 'rectangle') {
          shapeBlock = {
            "type": "//ly.img.ubq/shape/rect",
            "id": uuidv4(),
            "position": { "x": x, "y": y },
            "width": width,
            "height": height,
            "cornerRadius": cornerRadius,
            "fill": {
              "type": "//ly.img.ubq/fill/color",
              "color": hexToRgba(fillColor, opacity)
            }
          }
        } else if (shapeType === 'circle' || shapeType === 'ellipse') {
          shapeBlock = {
            "type": "//ly.img.ubq/shape/ellipse",
            "id": uuidv4(),
            "position": { "x": x, "y": y },
            "width": width,
            "height": height,
            "fill": {
              "type": "//ly.img.ubq/fill/color",
              "color": hexToRgba(fillColor, opacity)
            }
          }
        }

        // Add to scene
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          updatedScene.pages[0].blocks = [
            ...(updatedScene.pages[0].blocks || []),
            shapeBlock
          ]
        }

        return res.json({
          success: true,
          scene: updatedScene,
          blockId: shapeBlock.id
        })
      }
      
      case 'addTextBlock': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, text, x = 100, y = 100, fontSize = 48, color = '#000000' } = payload

        // Convert hex color to RGBA
        const hexToRgba = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255
          const g = parseInt(hex.slice(3, 5), 16) / 255
          const b = parseInt(hex.slice(5, 7), 16) / 255
          return { r, g, b, a: 1 }
        }

        // Create text block
        const textBlock = {
          "type": "//ly.img.ubq/text",
          "id": uuidv4(),
          "position": { "x": x, "y": y },
          "text": text,
          "fontSize": fontSize,
          "fill": {
            "type": "//ly.img.ubq/fill/color",
            "color": hexToRgba(color)
          }
        }

        // Add to scene
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          updatedScene.pages[0].blocks = [
            ...(updatedScene.pages[0].blocks || []),
            textBlock
          ]
        }

        return res.json({
          success: true,
          scene: updatedScene,
          blockId: textBlock.id
        })
      }
      
      case 'changeBackground': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, color = '#FFFFFF' } = payload

        // Convert hex color to RGBA
        const hexToRgba = (hex) => {
          const r = parseInt(hex.slice(1, 3), 16) / 255
          const g = parseInt(hex.slice(3, 5), 16) / 255
          const b = parseInt(hex.slice(5, 7), 16) / 255
          return { r, g, b, a: 1 }
        }

        // Update background
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          updatedScene.pages[0].fill = {
            "type": "//ly.img.ubq/fill/color",
            "color": hexToRgba(color)
          }
        }

        return res.json({
          success: true,
          scene: updatedScene
        })
      }
      
      case 'createDesign': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { format, templateScene } = payload

        // Format dimensions mapping
        const formatDimensions = {
          instagram_square: { width: 1080, height: 1080 },
          instagram_portrait: { width: 1080, height: 1350 },
          instagram_story: { width: 1080, height: 1920 },
          tiktok_vertical: { width: 1080, height: 1920 },
          youtube_thumbnail: { width: 1280, height: 720 },
          twitter_header: { width: 1500, height: 500 },
          custom: { width: 1080, height: 1080 }
        }

        const dimensions = formatDimensions[format] || formatDimensions.instagram_square

        // Create scene structure
        const scene = templateScene || {
          "version": "1.0",
          "type": "//ly.img.ubq/scene",
          "id": uuidv4(),
          "metadata": {
            "name": "New Design"
          },
          "pages": [
            {
              "type": "//ly.img.ubq/page",
              "id": uuidv4(),
              "width": dimensions.width,
              "height": dimensions.height,
              "fill": {
                "type": "//ly.img.ubq/fill/color",
                "color": { "r": 1, "g": 1, "b": 1, "a": 1 }
              },
              "blocks": []
            }
          ]
        }

        return res.json({
          success: true,
          scene: scene,
          sceneId: scene.id
        })
      }
      
      case 'deleteBlock': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, blockId } = payload

        // Remove block from scene
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          updatedScene.pages[0].blocks = updatedScene.pages[0].blocks.filter(
            block => block.id !== blockId
          )
        }

        return res.json({
          success: true,
          scene: updatedScene
        })
      }
      
      case 'extractBlocks': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene } = payload

        console.log('=== EXTRACTING BLOCKS ===')

        let sceneString = scene

        // Handle base64 encoded scenes (UBQ1 prefix)
        if (typeof scene === 'string' && scene.startsWith('UBQ1')) {
          const base64Content = scene.substring(4)
          // Use Buffer instead of atob for Node.js
          sceneString = Buffer.from(base64Content, 'base64').toString('utf-8')
        }

        let sceneData
        try {
          // If sceneString is already an object, use it directly
          if (typeof sceneString === 'object') {
            sceneData = sceneString
          } else {
            sceneData = JSON.parse(sceneString)
          }
          console.log('Parsed JSON successfully')
        } catch (e) {
          return res.status(400).json({ 
            error: 'Failed to parse scene',
            details: e.message
          })
        }

        const blocks = []
        
        if (sceneData.hierarchy && sceneData.hierarchy.children && Array.isArray(sceneData.hierarchy.children)) {
          console.log(`Found ${sceneData.hierarchy.children.length} children in hierarchy`)
          
          if (sceneData.designElements && Array.isArray(sceneData.designElements)) {
            console.log(`Found ${sceneData.designElements.length} design elements`)
            
            // Create a map of entity IDs to design elements
            const elementMap = new Map()
            for (const element of sceneData.designElements) {
              if (element.entity !== undefined) {
                elementMap.set(element.entity, element)
              }
            }
            
            console.log(`Created element map with ${elementMap.size} entries`)
            
            // Process each child from hierarchy (children are objects with {key, value})
            for (const child of sceneData.hierarchy.children) {
              const entityId = child.key // Extract the key property
              const element = elementMap.get(entityId)
              
              if (element) {
                const blockId = element.uuid || element.entity
                const blockType = element.id || ''
                const blockName = element.block_common?.name || ''
                
                console.log(`Block ${blockId}: type=${blockType}, name=${blockName}`)
                
                // Determine if it's a text or image block
                const isText = blockType.includes('text') || blockType.includes('Text')
                const isImage = blockType.includes('image') || blockType.includes('Image') || 
                               blockType.includes('graphic') || blockType.includes('Graphic')
                
                if (isText || isImage) {
                  console.log(`  ✓ Adding ${isText ? 'text' : 'image'} block`)
                  blocks.push({
                    id: String(blockId),
                    block_id: String(blockId),
                    name: blockName || String(blockId),
                    type: isText ? 'text' : 'image',
                    label: blockName || `${isText ? 'Text' : 'Image'} Block`,
                    preview: `${isText ? 'Text' : 'Image'}: ${blockName || String(blockId).substring(0, 20)}`
                  })
                } else {
                  console.log(`  → Skipping type: ${blockType}`)
                }
              } else {
                console.log(`  ⚠️ Entity ${entityId} not found in designElements`)
              }
            }
          } else {
            console.log('⚠️ No designElements array found')
          }
        } else {
          console.log('⚠️ No hierarchy.children array found')
        }
        
        console.log('=== EXTRACTION COMPLETE ===')
        console.log(`Blocks found: ${blocks.length}`)

        return res.json({
          success: true,
          blocks: blocks
        })
      }
      
      case 'getCESDKTemplates': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const CESDK_API_KEY = process.env.CESDK_API_KEY || process.env.CESDK_LICENSE_KEY

        if (!CESDK_API_KEY) {
          return res.status(500).json({ 
            error: 'CE.SDK API key not configured' 
          })
        }

        // Fetch CE.SDK templates from their API
        try {
          const response = await axios.get('https://api.img.ly/v1/templates', {
            headers: {
              'Authorization': `Bearer ${CESDK_API_KEY}`,
              'Content-Type': 'application/json'
            }
          })

          return res.json({
            success: true,
            templates: response.data.templates || []
          })
        } catch (apiError) {
          // If API call fails, return sample templates
          console.warn('CE.SDK API call failed, returning sample templates:', apiError.message)
          return res.json({
            success: true,
            templates: [
              {
                id: 'cesdk-social-post-1',
                name: 'Modern Social Post',
                category: 'social',
                format: 'instagram_square',
                thumbnail: 'https://img.ly/static/cesdk-templates/social-1.jpg',
                description: 'Clean and modern social media post template'
              },
              {
                id: 'cesdk-story-1',
                name: 'Story Template',
                category: 'story',
                format: 'instagram_story',
                thumbnail: 'https://img.ly/static/cesdk-templates/story-1.jpg',
                description: 'Engaging story template with text overlays'
              }
            ]
          })
        }
      }
      
      case 'inspectScene': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene } = payload

        console.log('Inspecting CE.SDK scene...')
        console.log('Scene type:', typeof scene)

        // Handle string scenes
        if (typeof scene !== 'string') {
          return res.status(400).json({ 
            error: 'Scene must be a string' 
          })
        }

        console.log('Scene starts with:', scene.substring(0, 50))

        let decodedScene = scene
        
        // Decode if base64
        if (scene.startsWith('UBQ1')) {
          try {
            const base64Content = scene.substring(4)
            decodedScene = Buffer.from(base64Content, 'base64').toString('utf-8')
            console.log('Successfully decoded base64')
          } catch (e) {
            console.error('Failed to decode:', e)
            return res.status(400).json({ error: 'Failed to decode scene' })
          }
        }

        // Just dump the first 10000 characters of the DECODED scene for inspection
        const preview = decodedScene.substring(0, 10000)
        
        // Try to find all occurrences of "variable" in the decoded scene
        const variableOccurrences = []
        const regex = /"[^"]*variable[^"]*"[^}]{0,200}/gi
        const matches = decodedScene.matchAll(regex)
        
        for (const match of matches) {
          variableOccurrences.push(match[0])
        }

        // Also look for placeholder patterns
        const placeholderOccurrences = []
        const placeholderRegex = /"placeholder[^}]{0,200}/gi
        const placeholderMatches = decodedScene.matchAll(placeholderRegex)
        
        for (const match of placeholderMatches) {
          placeholderOccurrences.push(match[0])
        }

        return res.json({
          success: true,
          scenePreview: preview,
          variableOccurrences: variableOccurrences.slice(0, 30),
          placeholderOccurrences: placeholderOccurrences.slice(0, 30),
          sceneLength: decodedScene.length,
          wasBase64: scene.startsWith('UBQ1')
        })
      }
      
      case 'moveBlock': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, blockId, direction } = payload

        // Move block in layer order
        const updatedScene = { ...scene }
        if (updatedScene.pages && updatedScene.pages[0]) {
          const blocks = [...updatedScene.pages[0].blocks]
          const index = blocks.findIndex(b => b.id === blockId)
          
          if (index === -1) {
            return res.status(404).json({ error: 'Block not found' })
          }

          if (direction === 'up' && index > 0) {
            // Swap with previous element (move forward in layer)
            [blocks[index], blocks[index - 1]] = [blocks[index - 1], blocks[index]]
          } else if (direction === 'down' && index < blocks.length - 1) {
            // Swap with next element (move backward in layer)
            [blocks[index], blocks[index + 1]] = [blocks[index + 1], blocks[index]]
          }

          updatedScene.pages[0].blocks = blocks
        }

        return res.json({
          success: true,
          scene: updatedScene
        })
      }
      
      case 'renderDesign': {
        // Auth check (equivalent to base44.auth.me())
        if (!req.user) {
          return res.status(401).json({ error: 'Unauthorized' })
        }

        const { scene, exportFormat = 'png' } = payload

        const CESDK_API_URL = 'https://api.img.ly/v1/renders'
        const CESDK_API_KEY = process.env.CESDK_API_KEY || process.env.CESDK_LICENSE_KEY

        if (!CESDK_API_KEY) {
          return res.status(500).json({ 
            error: 'CE.SDK API key not configured. Please set CESDK_API_KEY in environment variables.' 
          })
        }

        console.log('Processing scene data...')

        // Handle scene data - could be base64 string, JSON object, or JSON string
        let sceneData = scene
        if (typeof scene === 'string') {
          // Try to decode if it's base64
          try {
            if (scene.startsWith('UBQ1')) {
              const base64Content = scene.substring(4)
              const decoded = Buffer.from(base64Content, 'base64').toString('utf-8')
              sceneData = JSON.parse(decoded)
              console.log('Decoded base64 scene successfully')
            } else {
              // Try to parse as JSON directly
              sceneData = JSON.parse(scene)
              console.log('Parsed JSON scene successfully')
            }
          } catch {
            // If both fail, pass as is
            console.log('Using scene string as-is')
            sceneData = scene
          }
        }

        console.log('Rendering scene with CE.SDK API...')

        // Call CE.SDK REST API
        const response = await axios.post(CESDK_API_URL, {
          scene: sceneData,
          export: {
            format: exportFormat,
            jpegQuality: 0.95,
            pngCompressionLevel: 6
          }
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${CESDK_API_KEY}`
          },
          responseType: 'arraybuffer' // Get binary data
        })

        if (response.status !== 200) {
          const errorData = response.data ? Buffer.from(response.data).toString('utf-8') : 'Unknown error'
          console.error('CE.SDK API error:', errorData)
          return res.status(response.status).json({ 
            error: 'Failed to render design with CE.SDK API',
            details: errorData
          })
        }

        console.log('Rendering successful, uploading image...')

        // Get the rendered image buffer
        const imageBuffer = Buffer.from(response.data)
        
        // Get user ID
        const firebaseUserId = req.user?.uid
        if (!firebaseUserId) {
          return res.status(401).json({ error: 'User ID not found' })
        }

        // Generate unique file path
        const timestamp = Date.now()
        const randomString = Math.random().toString(36).substring(7)
        const fileName = `design_${timestamp}_${randomString}.${exportFormat}`
        const filePath = `uploads/${firebaseUserId}/${fileName}`

        // Determine MIME type
        const mimeType = exportFormat === 'png' ? 'image/png' : 
                         exportFormat === 'jpg' || exportFormat === 'jpeg' ? 'image/jpeg' : 
                         `image/${exportFormat}`

        // Upload to Supabase Storage
        const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, imageBuffer, {
            contentType: mimeType,
            cacheControl: '3600',
            upsert: false,
            metadata: {
              originalName: fileName,
              uploadedAt: new Date().toISOString(),
              userId: firebaseUserId,
              rendered: true
            }
          })

        if (uploadError) {
          console.error('❌ Supabase storage upload error:', uploadError)
          return res.status(500).json({
            error: 'storage_upload_failed',
            message: uploadError.message || 'Failed to upload rendered image'
          })
        }

        // Get public URL
        const { data: urlData } = supabaseAdmin.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath)

        const publicUrl = urlData.publicUrl

        console.log('Upload successful:', publicUrl)

        // Create metadata record in uploads table
        const userId = firebaseIdToUuid(firebaseUserId)
        const uploadRecord = {
          user_id: userId,
          file_name: fileName,
          file_url: publicUrl,
          file_type: 'image',
          mime_type: mimeType,
          file_size: imageBuffer.length,
          storage_path: filePath,
          metadata: {
            original_name: fileName,
            uploaded_at: new Date().toISOString(),
            content_type: mimeType,
            firebase_user_id: firebaseUserId,
            rendered: true,
            export_format: exportFormat
          }
        }

        // Insert upload record (don't fail if this fails)
        try {
          await supabaseAdmin.from('uploads').insert(uploadRecord)
        } catch (dbError) {
          console.warn('Failed to create upload record (non-critical):', dbError.message)
        }

        return res.json({
          success: true,
          imageUrl: publicUrl,
          format: exportFormat
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
