const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')
const ContentController = require('../controllers/ContentController')
const ContentModel = require('../models/Content')
const { extractAuth } = require('../middleware/extractAuth')

// Apply auth extraction to all routes
router.use(extractAuth)

// AI Content Generation Routes
router.post('/generate-text', ContentController.generateText)
router.post('/generate-image', ContentController.generateImage)
router.post('/brainstorm', ContentController.brainstormIdeas)
router.post('/improve', ContentController.improveContent)

// Async generation routes (using background workers)
const { queueTextGeneration, queueImageGeneration, queueBrainstorm, getJobStatus } = require('../workers/contentWorker')

router.post('/generate-text/async', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId
    if (!userId) {
      return res.status(401).json({ error: 'authentication_required' })
    }

    const job = await queueTextGeneration({
      ...req.body,
      userId
    })

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      message: 'Text generation queued. Use GET /api/content/jobs/:jobId to check status.'
    })
  } catch (error) {
    res.status(500).json({
      error: 'queue_failed',
      message: error.message
    })
  }
})

router.post('/generate-image/async', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId
    if (!userId) {
      return res.status(401).json({ error: 'authentication_required' })
    }

    const job = await queueImageGeneration({
      ...req.body,
      userId
    })

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      message: 'Image generation queued. Use GET /api/content/jobs/:jobId to check status.'
    })
  } catch (error) {
    res.status(500).json({
      error: 'queue_failed',
      message: error.message
    })
  }
})

router.post('/brainstorm/async', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.userId
    if (!userId) {
      return res.status(401).json({ error: 'authentication_required' })
    }

    const job = await queueBrainstorm({
      ...req.body,
      userId
    })

    res.json({
      success: true,
      jobId: job.jobId,
      status: job.status,
      message: 'Brainstorm queued. Use GET /api/content/jobs/:jobId to check status.'
    })
  } catch (error) {
    res.status(500).json({
      error: 'queue_failed',
      message: error.message
    })
  }
})

// Get job status
router.get('/jobs/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params
    const status = await getJobStatus(jobId)
    res.json(status)
  } catch (error) {
    res.status(500).json({
      error: 'status_check_failed',
      message: error.message
    })
  }
})

// Legacy CRUD routes (maintained for backward compatibility)
router.get('/', async (req, res) => {
  try {
    const userId = req.user?.uid
    if (!userId) {
      return res.status(401).json({ error: 'authentication_required' })
    }

    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
    
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'content_list_failed', message: e.message })
  }
})

router.get('/filter', async (req, res) => {
  try {
    const userId = req.user?.uid
    if (!userId) {
      return res.status(401).json({ error: 'authentication_required' })
    }

    const filters = {
      status: req.query.status,
      brand_id: req.query.brand_id,
      platform: req.query.platform,
      content_type: req.query.content_type,
      limit: req.query.limit ? parseInt(req.query.limit) : undefined
    }

    const content = await ContentModel.getByUserId(userId, filters)
    res.json(content || [])
  } catch (e) {
    res.status(500).json({ error: 'content_filter_failed', message: e.message })
  }
})

// Get content by ID
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.uid

    const content = await ContentModel.getById(id)
    if (!content) {
      return res.status(404).json({ error: 'content_not_found' })
    }

    if (content.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' })
    }

    res.json(content)
  } catch (e) {
    res.status(500).json({ error: 'content_fetch_failed', message: e.message })
  }
})

// Update content status (workflow)
router.patch('/:id/status', async (req, res) => {
  try {
    const { id } = req.params
    const { status } = req.body
    const userId = req.user?.uid

    const content = await ContentModel.getById(id)
    if (!content) {
      return res.status(404).json({ error: 'content_not_found' })
    }

    if (content.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const updated = await ContentModel.updateStatus(id, status)
    res.json(updated)
  } catch (e) {
    res.status(500).json({ error: 'status_update_failed', message: e.message })
  }
})

router.post('/', async (req, res) => {
  try {
    // Extract user ID from authenticated user
    const userId = req.user?.uid;
    if (!userId) {
      return res.status(401).json({ 
        error: 'authentication_required',
        message: 'User authentication required' 
      });
    }

    // Log the request for debugging
    console.log('Content creation request:', {
      userId,
      bodyKeys: Object.keys(req.body),
      hasOriginalInput: !!req.body.original_input,
      hasTitle: !!req.body.ai_generated_title
    });

    // Map frontend fields to database schema
    const contentData = {
      user_id: userId,
      // Map frontend fields to database fields
      title: req.body.ai_generated_title || req.body.title || req.body.original_input?.substring(0, 100) || 'Untitled',
      description: req.body.description || req.body.original_input?.substring(0, 500) || null,
      content_type: req.body.content_type || req.body.input_type || null,
      status: req.body.status || 'draft',
      platform: req.body.platform || null,
      brand_id: req.body.brand_id || req.body.preselected_brand || null,
      // Store additional frontend-specific fields in metadata
      metadata: {
        ...(req.body.metadata || {}),
        original_input: req.body.original_input || null,
        input_type: req.body.input_type || null,
        ai_generated_category: req.body.ai_generated_category || null,
        research_data: req.body.research_data || null,
        viral_score: req.body.viral_score || null,
        brand_content: req.body.brand_content || null,
        preselected_brand: req.body.preselected_brand || null,
        brainstorm_history: req.body.brainstorm_history || null,
        additional_context: req.body.additional_context || null,
        instructions: req.body.instructions || null,
        selected_formats: req.body.selected_formats || null,
        format_templates: req.body.format_templates || null,
        format_options: req.body.format_options || null,
        generated_text: req.body.generated_text || null,
        visual_setup: req.body.visual_setup || null,
        generated_visuals: req.body.generated_visuals || null,
        editor_scenes: req.body.editor_scenes || null,
        workflow_step: req.body.workflow_step || null,
        uploaded_image_urls: req.body.uploaded_image_urls || null
      },
      text_content: req.body.text_content || null,
      media_urls: req.body.media_urls || req.body.uploaded_image_urls || null,
      source: req.body.source || null,
      scheduled_for: req.body.scheduled_for || null
    };

    // Validate required fields
    if (!contentData.title || contentData.title.trim() === '') {
      return res.status(400).json({ 
        error: 'validation_failed',
        message: 'Title is required. Provide ai_generated_title, title, or original_input.',
        received: {
          ai_generated_title: req.body.ai_generated_title,
          title: req.body.title,
          original_input: req.body.original_input ? 'present' : 'missing'
        }
      });
    }

    // Use ContentModel.create for proper validation and error handling
    try {
      const createdContent = await ContentModel.create(contentData);
      
      res.setHeader('Content-Type', 'application/json');
      res.status(201).json(createdContent);
    } catch (modelError) {
      console.error('ContentModel.create error:', modelError);
      return res.status(400).json({ 
        error: 'content_creation_failed',
        message: modelError.message || 'Failed to create content',
        details: process.env.NODE_ENV === 'development' ? modelError.stack : undefined
      });
    }
  } catch (e) {
    console.error('Content creation error:', e);
    res.setHeader('Content-Type', 'application/json');
    res.status(500).json({ 
      error: 'content_create_failed',
      message: e.message || 'An unexpected error occurred',
      details: process.env.NODE_ENV === 'development' ? e.stack : undefined
    });
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.uid

    // Verify ownership
    const existing = await ContentModel.getById(id)
    if (!existing) {
      return res.status(404).json({ error: 'content_not_found' })
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' })
    }

    const { data, error } = await supabaseAdmin
      .from('content')
      .update(req.body)
      .eq('id', id)
      .select('*')
      .single()
    
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'content_update_failed', message: e.message })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const userId = req.user?.uid

    // Verify ownership
    const existing = await ContentModel.getById(id)
    if (!existing) {
      return res.status(404).json({ error: 'content_not_found' })
    }
    if (existing.user_id !== userId) {
      return res.status(403).json({ error: 'forbidden' })
    }

    // Soft delete
    await ContentModel.delete(id)
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'content_delete_failed', message: e.message })
  }
})

module.exports = router