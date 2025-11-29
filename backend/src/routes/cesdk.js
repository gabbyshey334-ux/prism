const router = require('express').Router();
const CESDKController = require('../controllers/CESDKController');
const TemplateModel = require('../models/Template');
const { extractAuth } = require('../middleware/extractAuth');

// Apply auth extraction to all routes
router.use(extractAuth);

/**
 * GET /api/cesdk/key
 * Get CE.SDK API key
 */
router.get('/key', CESDKController.getCESDKKey);

/**
 * POST /api/cesdk/create
 * Create new design
 */
router.post('/create', CESDKController.createDesign);

/**
 * POST /api/cesdk/render
 * Render design to image
 */
router.post('/render', CESDKController.renderDesign);

/**
 * POST /api/cesdk/apply-template
 * Apply template to scene
 */
router.post('/apply-template', CESDKController.applyTemplate);

/**
 * POST /api/cesdk/apply-content
 * Apply content to template (replace placeholders)
 */
router.post('/apply-content', CESDKController.applyContentToTemplate);

/**
 * POST /api/cesdk/blocks/text
 * Add text block
 */
router.post('/blocks/text', CESDKController.addTextBlock);

/**
 * POST /api/cesdk/blocks/image
 * Add image block
 */
router.post('/blocks/image', CESDKController.addImageBlock);

/**
 * POST /api/cesdk/blocks/shape
 * Add shape block
 */
router.post('/blocks/shape', CESDKController.addShapeBlock);

/**
 * POST /api/cesdk/blocks/delete
 * Delete block
 */
router.post('/blocks/delete', CESDKController.deleteBlock);

/**
 * POST /api/cesdk/blocks/move
 * Move block
 */
router.post('/blocks/move', CESDKController.moveBlock);

/**
 * POST /api/cesdk/blocks/extract
 * Extract blocks from scene
 */
router.post('/blocks/extract', CESDKController.extractBlocks);

/**
 * POST /api/cesdk/background
 * Change background
 */
router.post('/background', CESDKController.changeBackground);

/**
 * POST /api/cesdk/inspect
 * Inspect scene structure
 */
router.post('/inspect', CESDKController.inspectScene);

/**
 * Template Management Routes
 */

/**
 * GET /api/cesdk/templates
 * List templates
 */
router.get('/templates', async (req, res) => {
  try {
    const userId = req.user?.uid;
    const {
      brand_id,
      platform,
      template_type,
      category,
      is_favorite,
      search,
      limit = 50,
      offset = 0,
      is_public = false
    } = req.query;

    const filters = {
      user_id: is_public ? undefined : userId,
      brand_id: brand_id || undefined,
      platform: platform || undefined,
      template_type: template_type || undefined,
      category: category || undefined,
      is_favorite: is_favorite === 'true' ? true : undefined,
      search: search || undefined,
      limit: parseInt(limit),
      offset: parseInt(offset)
    };

    let templates;
    if (is_public === 'true') {
      templates = await TemplateModel.getPublicTemplates(filters);
    } else {
      templates = await TemplateModel.getTemplates(filters);
    }

    res.json({
      success: true,
      templates,
      count: templates.length,
      filters
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_templates_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/cesdk/templates/:id
 * Get template by ID
 */
router.get('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const template = await TemplateModel.getById(id);

    if (!template) {
      return res.status(404).json({
        error: 'template_not_found',
        message: 'Template not found'
      });
    }

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_template_failed',
      message: error.message
    });
  }
});

/**
 * POST /api/cesdk/templates
 * Create template
 */
router.post('/templates', async (req, res) => {
  try {
    const userId = req.user?.uid || req.body.user_id;

    if (!userId) {
      return res.status(401).json({
        error: 'authentication_required',
        message: 'User authentication required'
      });
    }

    const template = await TemplateModel.create({
      ...req.body,
      user_id: userId
    });

    res.json({
      success: true,
      template
    });
  } catch (error) {
    res.status(500).json({
      error: 'create_template_failed',
      message: error.message
    });
  }
});

/**
 * PUT /api/cesdk/templates/:id
 * Update template
 */
router.put('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    // Verify ownership
    const existing = await TemplateModel.getById(id);
    if (!existing) {
      return res.status(404).json({
        error: 'template_not_found',
        message: 'Template not found'
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have permission to update this template'
      });
    }

    const updated = await TemplateModel.update(id, req.body);

    res.json({
      success: true,
      template: updated
    });
  } catch (error) {
    res.status(500).json({
      error: 'update_template_failed',
      message: error.message
    });
  }
});

/**
 * DELETE /api/cesdk/templates/:id
 * Delete template
 */
router.delete('/templates/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user?.uid;

    // Verify ownership
    const existing = await TemplateModel.getById(id);
    if (!existing) {
      return res.status(404).json({
        error: 'template_not_found',
        message: 'Template not found'
      });
    }

    if (existing.user_id !== userId) {
      return res.status(403).json({
        error: 'forbidden',
        message: 'You do not have permission to delete this template'
      });
    }

    await TemplateModel.delete(id);

    res.json({
      success: true,
      message: 'Template deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      error: 'delete_template_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/cesdk/templates/category/:category
 * Get templates by category
 */
router.get('/templates/category/:category', async (req, res) => {
  try {
    const { category } = req.params;
    const { limit = 20 } = req.query;

    const templates = await TemplateModel.getByCategory(category, parseInt(limit));

    res.json({
      success: true,
      templates,
      category,
      count: templates.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_category_templates_failed',
      message: error.message
    });
  }
});

/**
 * GET /api/cesdk/templates/platform/:platform
 * Get templates by platform
 */
router.get('/templates/platform/:platform', async (req, res) => {
  try {
    const { platform } = req.params;
    const { limit = 20 } = req.query;

    const templates = await TemplateModel.getByPlatform(platform, parseInt(limit));

    res.json({
      success: true,
      templates,
      platform,
      count: templates.length
    });
  } catch (error) {
    res.status(500).json({
      error: 'fetch_platform_templates_failed',
      message: error.message
    });
  }
});

module.exports = router;


