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
    const { data, error } = await supabaseAdmin.from('content').insert(req.body).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'content_create_failed' })
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