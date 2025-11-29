const cesdkService = require('../services/cesdk');
const TemplateModel = require('../models/Template');
const ContentModel = require('../models/Content');
const { getStorage } = require('../config/firebase');
const logger = require('../workers/logger');

/**
 * CE.SDK Controller
 * Handles CreativeEditor SDK operations
 */
class CESDKController {
  /**
   * Create new design
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async createDesign(req, res) {
    try {
      const {
        format = 'instagram_post',
        dimensions = null,
        backgroundColor = '#FFFFFF',
        saveAsTemplate = false,
        templateName = null
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      // Create design
      const design = await cesdkService.createDesign({
        format,
        dimensions,
        backgroundColor
      });

      // Save as template if requested
      let template = null;
      if (saveAsTemplate && templateName) {
        template = await TemplateModel.create({
          user_id: userId,
          name: templateName,
          description: `Design template for ${format}`,
          template_type: 'design',
          platform: format,
          content: JSON.stringify(design.scene),
          cesdk_design: design.scene, // Store as JSON string in cesdk_scene or cesdk_design field
          tags: [format, 'design']
        });
      }

      res.json({
        success: true,
        design: {
          scene: design.scene,
          format: design.format,
          dimensions: design.dimensions
        },
        template: template ? {
          id: template.id,
          name: template.name
        } : null
      });
    } catch (error) {
      logger.error('Create design error:', error);
      res.status(500).json({
        error: 'design_creation_failed',
        message: error.message
      });
    }
  }

  /**
   * Render design to image
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async renderDesign(req, res) {
    try {
      const {
        scene,
        format = 'png',
        quality = 90,
        scale = 1,
        uploadToStorage = false,
        contentId = null
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene data is required'
        });
      }

      // Render design
      const renderResult = await cesdkService.renderDesign({
        scene,
        format,
        quality,
        scale
      });

      // Upload to storage if requested
      let storageUrl = null;
      if (uploadToStorage && renderResult.imageBuffer) {
        const filename = `render-${Date.now()}.${format}`;
        storageUrl = await cesdkService.uploadToStorage(
          renderResult.imageBuffer,
          filename,
          `image/${format}`
        );

        // Update content if contentId provided
        if (contentId) {
          const content = await ContentModel.getById(contentId);
          if (content) {
            const mediaUrls = content.media_urls || [];
            await ContentModel.update(contentId, {
              media_urls: [...mediaUrls, storageUrl],
              status: 'visuals_generated'
            });
          }
        }
      }

      res.json({
        success: true,
        render: {
          scene: renderResult.scene,
          render_url: renderResult.render_url || storageUrl,
          format,
          quality,
          scale
        },
        storage_url: storageUrl,
        message: renderResult.message
      });
    } catch (error) {
      logger.error('Render design error:', error);
      res.status(500).json({
        error: 'design_rendering_failed',
        message: error.message
      });
    }
  }

  /**
   * Apply template to scene
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async applyTemplate(req, res) {
    try {
      const {
        scene,
        templateId,
        template = null
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene data is required'
        });
      }

      // Get template if templateId provided
      let templateData = template;
      if (templateId && !template) {
        templateData = await TemplateModel.getById(templateId);
        if (!templateData) {
          return res.status(404).json({
            error: 'template_not_found',
            message: 'Template not found'
          });
        }

        // Increment use count
        await TemplateModel.incrementUseCount(templateId);

        // Get template scene (handle both cesdk_scene and cesdk_design fields)
        if (templateData.cesdk_scene) {
          templateData = typeof templateData.cesdk_scene === 'string' 
            ? JSON.parse(templateData.cesdk_scene) 
            : templateData.cesdk_scene;
        } else if (templateData.cesdk_design) {
          templateData = typeof templateData.cesdk_design === 'string' 
            ? JSON.parse(templateData.cesdk_design) 
            : templateData.cesdk_design;
        } else {
          templateData = typeof templateData.content === 'string'
            ? JSON.parse(templateData.content)
            : templateData.content;
        }
      }

      if (!templateData) {
        return res.status(400).json({
          error: 'template_required',
          message: 'Either templateId or template data is required'
        });
      }

      // Apply template
      const result = await cesdkService.applyTemplate({
        scene,
        template: templateData
      });

      res.json({
        success: true,
        scene: result.scene,
        applied_at: result.applied_at
      });
    } catch (error) {
      logger.error('Apply template error:', error);
      res.status(500).json({
        error: 'template_application_failed',
        message: error.message
      });
    }
  }

  /**
   * Apply content to template (replace placeholders)
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async applyContentToTemplate(req, res) {
    try {
      const {
        templateId,
        template = null,
        content,
        contentId = null
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      // Get template if templateId provided
      let templateData = template;
      if (templateId && !template) {
        templateData = await TemplateModel.getById(templateId);
        if (!templateData) {
          return res.status(404).json({
            error: 'template_not_found',
            message: 'Template not found'
          });
        }

        // Increment use count
        await TemplateModel.incrementUseCount(templateId);

        // Get template scene (handle both cesdk_scene and cesdk_design fields)
        if (templateData.cesdk_scene) {
          templateData = typeof templateData.cesdk_scene === 'string' 
            ? JSON.parse(templateData.cesdk_scene) 
            : templateData.cesdk_scene;
        } else if (templateData.cesdk_design) {
          templateData = typeof templateData.cesdk_design === 'string' 
            ? JSON.parse(templateData.cesdk_design) 
            : templateData.cesdk_design;
        } else {
          templateData = typeof templateData.content === 'string'
            ? JSON.parse(templateData.content)
            : templateData.content;
        }
      }

      if (!templateData) {
        return res.status(400).json({
          error: 'template_required',
          message: 'Either templateId or template data is required'
        });
      }

      if (!content) {
        return res.status(400).json({
          error: 'content_required',
          message: 'Content data is required'
        });
      }

      // Apply content to template
      const result = await cesdkService.applyContentToTemplate({
        template: templateData,
        content
      });

      // Update content if contentId provided
      if (contentId) {
        await ContentModel.updateMetadata(contentId, {
          cesdk_scene: result.scene,
          template_applied_at: result.applied_at
        });
      }

      res.json({
        success: true,
        scene: result.scene,
        applied_content: result.applied_content,
        applied_at: result.applied_at
      });
    } catch (error) {
      logger.error('Apply content to template error:', error);
      res.status(500).json({
        error: 'content_application_failed',
        message: error.message
      });
    }
  }

  /**
   * Add text block
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async addTextBlock(req, res) {
    try {
      const { scene, text, position, style } = req.body;

      if (!scene || !text) {
        return res.status(400).json({
          error: 'scene_and_text_required',
          message: 'Scene and text are required'
        });
      }

      const result = await cesdkService.addTextBlock({
        scene,
        text,
        position,
        style
      });

      res.json({
        success: true,
        scene: result.scene,
        block: result.block,
        added_at: result.added_at
      });
    } catch (error) {
      logger.error('Add text block error:', error);
      res.status(500).json({
        error: 'add_text_block_failed',
        message: error.message
      });
    }
  }

  /**
   * Add image block
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async addImageBlock(req, res) {
    try {
      const { scene, imageUrl, position, size } = req.body;

      if (!scene || !imageUrl) {
        return res.status(400).json({
          error: 'scene_and_image_required',
          message: 'Scene and imageUrl are required'
        });
      }

      const result = await cesdkService.addImageBlock({
        scene,
        imageUrl,
        position,
        size
      });

      res.json({
        success: true,
        scene: result.scene,
        block: result.block,
        added_at: result.added_at
      });
    } catch (error) {
      logger.error('Add image block error:', error);
      res.status(500).json({
        error: 'add_image_block_failed',
        message: error.message
      });
    }
  }

  /**
   * Add shape block
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async addShapeBlock(req, res) {
    try {
      const { scene, shapeType, position, size, style } = req.body;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene is required'
        });
      }

      const result = await cesdkService.addShapeBlock({
        scene,
        shapeType,
        position,
        size,
        style
      });

      res.json({
        success: true,
        scene: result.scene,
        block: result.block,
        added_at: result.added_at
      });
    } catch (error) {
      logger.error('Add shape block error:', error);
      res.status(500).json({
        error: 'add_shape_block_failed',
        message: error.message
      });
    }
  }

  /**
   * Change background
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async changeBackground(req, res) {
    try {
      const { scene, backgroundColor, backgroundImage } = req.body;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene is required'
        });
      }

      const result = await cesdkService.changeBackground({
        scene,
        backgroundColor,
        backgroundImage
      });

      res.json({
        success: true,
        scene: result.scene,
        updated_at: result.updated_at
      });
    } catch (error) {
      logger.error('Change background error:', error);
      res.status(500).json({
        error: 'change_background_failed',
        message: error.message
      });
    }
  }

  /**
   * Delete block
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async deleteBlock(req, res) {
    try {
      const { scene, blockId } = req.body;

      if (!scene || !blockId) {
        return res.status(400).json({
          error: 'scene_and_blockid_required',
          message: 'Scene and blockId are required'
        });
      }

      const result = await cesdkService.deleteBlock({
        scene,
        blockId
      });

      res.json({
        success: true,
        scene: result.scene,
        deleted_block_id: result.deleted_block_id,
        updated_at: result.updated_at
      });
    } catch (error) {
      logger.error('Delete block error:', error);
      res.status(500).json({
        error: 'delete_block_failed',
        message: error.message
      });
    }
  }

  /**
   * Move block
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async moveBlock(req, res) {
    try {
      const { scene, blockId, position } = req.body;

      if (!scene || !blockId || !position) {
        return res.status(400).json({
          error: 'scene_blockid_position_required',
          message: 'Scene, blockId, and position are required'
        });
      }

      const result = await cesdkService.moveBlock({
        scene,
        blockId,
        position
      });

      res.json({
        success: true,
        scene: result.scene,
        moved_block_id: result.moved_block_id,
        updated_at: result.updated_at
      });
    } catch (error) {
      logger.error('Move block error:', error);
      res.status(500).json({
        error: 'move_block_failed',
        message: error.message
      });
    }
  }

  /**
   * Extract blocks
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async extractBlocks(req, res) {
    try {
      const { scene, type } = req.body;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene is required'
        });
      }

      const result = await cesdkService.extractBlocks({
        scene,
        type
      });

      res.json({
        success: true,
        blocks: result.blocks,
        count: result.count,
        extracted_at: result.extracted_at
      });
    } catch (error) {
      logger.error('Extract blocks error:', error);
      res.status(500).json({
        error: 'extract_blocks_failed',
        message: error.message
      });
    }
  }

  /**
   * Inspect scene
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async inspectScene(req, res) {
    try {
      const { scene } = req.body;

      if (!scene) {
        return res.status(400).json({
          error: 'scene_required',
          message: 'Scene is required'
        });
      }

      const result = await cesdkService.inspectScene({
        scene
      });

      res.json({
        success: true,
        inspection: result
      });
    } catch (error) {
      logger.error('Inspect scene error:', error);
      res.status(500).json({
        error: 'inspect_scene_failed',
        message: error.message
      });
    }
  }

  /**
   * Get CE.SDK API key
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async getCESDKKey(req, res) {
    try {
      const apiKey = cesdkService.getApiKey();

      if (!apiKey) {
        return res.status(503).json({
          error: 'cesdk_not_configured',
          message: 'CE.SDK API key is not configured'
        });
      }

      res.json({
        success: true,
        apiKey
      });
    } catch (error) {
      logger.error('Get CE.SDK key error:', error);
      res.status(500).json({
        error: 'get_key_failed',
        message: error.message
      });
    }
  }
}

module.exports = CESDKController;

