const openaiService = require('../services/ai/openai');
const anthropicService = require('../services/ai/anthropic');
const imageGenService = require('../services/ai/imageGen');
const promptService = require('../services/ai/prompts');
const ContentModel = require('../models/Content');
const TrendingTopicModel = require('../models/TrendingTopic');
const trendAnalytics = require('../services/trends/trendAnalytics');
const logger = require('../workers/logger');

/**
 * Content Controller
 * Handles AI content generation operations
 */
class ContentController {
  /**
   * Generate text content
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async generateText(req, res) {
    try {
      const {
        topic,
        platform,
        contentType = 'post',
        brandContext = '',
        tone = 'professional',
        audience = 'general',
        style = 'engaging',
        provider = 'openai', // 'openai' or 'anthropic'
        contentId = null,
        generateVariations = false,
        variationCount = 3
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      if (!topic) {
        return res.status(400).json({
          error: 'topic_required',
          message: 'Topic is required'
        });
      }

      // Build prompt
      const { system, user } = promptService.buildContentPrompt({
        topic,
        platform: platform || 'instagram',
        contentType,
        brandContext,
        tone,
        audience,
        style
      });

      // Select AI provider
      let aiService;
      if (provider === 'anthropic' && anthropicService.isAvailable()) {
        aiService = anthropicService;
      } else if (openaiService.isAvailable()) {
        aiService = openaiService;
      } else {
        return res.status(503).json({
          error: 'ai_service_unavailable',
          message: 'No AI service is configured or available'
        });
      }

      // Generate content
      const schema = {
        type: 'object',
        properties: {
          caption: { type: 'string' },
          hashtags: { type: 'array', items: { type: 'string' } },
          cta: { type: 'string' }
        },
        required: ['caption', 'hashtags']
      };

      let generatedContent;
      try {
        generatedContent = await aiService.generateJSON({
          prompt: user,
          schema,
          systemPrompt: system,
          userId: userId
        });
      } catch (error) {
        logger.error('AI text generation error:', error);
        return res.status(500).json({
          error: 'generation_failed',
          message: error.message
        });
      }

      // Generate variations if requested
      let variations = [];
      if (generateVariations && variationCount > 1) {
        for (let i = 0; i < variationCount - 1; i++) {
          try {
            const variation = await aiService.generateJSON({
              prompt: user + '\n\nCreate a variation of this content with a different approach.',
              schema,
              systemPrompt: system,
              userId: userId
            });
            variations.push(variation);
          } catch (error) {
            logger.warn(`Failed to generate variation ${i + 1}:`, error.message);
          }
        }
      }

      // Check if content was generated from a trend
      const trendId = req.body.trendId;

      // Create or update content record
      let content;
      if (contentId) {
        // Update existing content
        content = await ContentModel.update(contentId, {
          text_content: JSON.stringify(generatedContent),
          status: 'text_generated',
          metadata: {
            ...(await ContentModel.getById(contentId))?.metadata || {},
            generated_by: provider,
            generated_at: new Date().toISOString(),
            variations: variations.length > 0 ? variations : undefined,
            trend_id: trendId || undefined
          }
        });
      } else {
        // Create new content
        content = await ContentModel.create({
          user_id: userId,
          title: topic.substring(0, 100),
          description: generatedContent.caption?.substring(0, 500),
          content_type: contentType,
          status: 'text_generated',
          text_content: JSON.stringify(generatedContent),
          platform: platform || 'instagram',
          metadata: {
            generated_by: provider,
            generated_at: new Date().toISOString(),
            topic,
            brandContext,
            tone,
            audience,
            style,
            variations: variations.length > 0 ? variations : undefined,
            trend_id: trendId || undefined
          }
        });
      }

      // Track trend usage if trendId provided
      if (trendId) {
        try {
          await trendAnalytics.trackTrendUsage(trendId, content.id, userId);
        } catch (analyticsError) {
          logger.warn('Failed to track trend usage:', analyticsError.message);
        }
      }

      res.json({
        success: true,
        content: {
          id: content.id,
          text_content: generatedContent,
          variations: variations.length > 0 ? variations : undefined,
          status: content.status,
          platform: content.platform
        },
        provider: provider
      });
    } catch (error) {
      logger.error('Generate text error:', error);
      res.status(500).json({
        error: 'text_generation_failed',
        message: error.message
      });
    }
  }

  /**
   * Generate image content
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async generateImage(req, res) {
    try {
      const {
        prompt,
        contentId = null,
        size = '1024x1024',
        quality = 'standard',
        style = 'vivid',
        generateVariations = false,
        variationCount = 3
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      if (!prompt) {
        return res.status(400).json({
          error: 'prompt_required',
          message: 'Image prompt is required'
        });
      }

      // Generate image
      let imageData;
      try {
        imageData = await imageGenService.generateImage({
          prompt,
          size,
          quality,
          style,
          userId: userId
        });
      } catch (error) {
        logger.error('AI image generation error:', error);
        return res.status(500).json({
          error: 'image_generation_failed',
          message: error.message
        });
      }

      // Generate variations if requested
      let variations = [];
      if (generateVariations && variationCount > 1) {
        const variationPrompts = Array(variationCount - 1).fill(null).map((_, i) => 
          `${prompt} (variation ${i + 1}, different style or composition)`
        );
        
        try {
          variations = await imageGenService.generateVariations({
            prompt,
            count: variationCount - 1,
            variations: variationPrompts,
            userId: userId
          });
        } catch (error) {
          logger.warn('Failed to generate image variations:', error.message);
        }
      }

      // Create or update content record
      const mediaUrls = [imageData.url, ...variations.map(v => v.url)].filter(Boolean);
      
      let content;
      if (contentId) {
        // Update existing content
        const existing = await ContentModel.getById(contentId);
        const existingUrls = existing?.media_urls || [];
        content = await ContentModel.update(contentId, {
          media_urls: [...existingUrls, ...mediaUrls],
          status: existing?.status === 'text_generated' ? 'visuals_generated' : existing?.status || 'draft',
          metadata: {
            ...(existing?.metadata || {}),
            image_generated_at: new Date().toISOString(),
            image_prompt: prompt,
            image_variations: variations.length > 0 ? variations : undefined
          }
        });
      } else {
        // Create new content
        content = await ContentModel.create({
          user_id: userId,
          title: prompt.substring(0, 100),
          content_type: 'image',
          status: 'visuals_generated',
          media_urls: mediaUrls,
          metadata: {
            image_generated_at: new Date().toISOString(),
            image_prompt: prompt,
            image_variations: variations.length > 0 ? variations : undefined
          }
        });
      }

      res.json({
        success: true,
        content: {
          id: content.id,
          images: {
            primary: imageData,
            variations: variations.length > 0 ? variations : undefined
          },
          media_urls: mediaUrls,
          status: content.status
        }
      });
    } catch (error) {
      logger.error('Generate image error:', error);
      res.status(500).json({
        error: 'image_generation_failed',
        message: error.message
      });
    }
  }

  /**
   * Brainstorm content ideas
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async brainstormIdeas(req, res) {
    try {
      const {
        topic,
        brandContext = '',
        platform = 'all',
        count = 5,
        provider = 'openai'
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      if (!topic) {
        return res.status(400).json({
          error: 'topic_required',
          message: 'Topic is required'
        });
      }

      // Select AI provider
      let aiService;
      if (provider === 'anthropic' && anthropicService.isAvailable()) {
        aiService = anthropicService;
      } else if (openaiService.isAvailable()) {
        aiService = openaiService;
      } else {
        return res.status(503).json({
          error: 'ai_service_unavailable',
          message: 'No AI service is configured or available'
        });
      }

      // Build brainstorm prompt
      const prompt = promptService.buildBrainstormPrompt({
        topic,
        brandContext,
        platform,
        count
      });

      // Generate ideas
      const schema = {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            description: { type: 'string' },
            content_type: { type: 'string' },
            key_points: { type: 'array', items: { type: 'string' } },
            target_audience: { type: 'string' },
            engagement_strategy: { type: 'string' }
          },
          required: ['title', 'description', 'content_type']
        }
      };

      let ideas;
      try {
        ideas = await aiService.generateJSON({
          prompt,
          schema,
          systemPrompt: 'You are a creative content strategist that generates engaging social media content ideas.',
          userId: userId
        });
      } catch (error) {
        logger.error('Brainstorm error:', error);
        return res.status(500).json({
          error: 'brainstorm_failed',
          message: error.message
        });
      }

      // Ensure we have an array
      if (!Array.isArray(ideas)) {
        ideas = [ideas];
      }

      // Limit to requested count
      ideas = ideas.slice(0, count);

      res.json({
        success: true,
        ideas,
        count: ideas.length,
        provider: provider
      });
    } catch (error) {
      logger.error('Brainstorm error:', error);
      res.status(500).json({
        error: 'brainstorm_failed',
        message: error.message
      });
    }
  }

  /**
   * Improve existing content
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async improveContent(req, res) {
    try {
      const {
        contentId,
        originalContent,
        platform,
        improvementType = 'general',
        specificFeedback = '',
        provider = 'openai'
      } = req.body;

      const userId = req.user?.uid || req.body.userId;

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      if (!contentId && !originalContent) {
        return res.status(400).json({
          error: 'content_required',
          message: 'Either contentId or originalContent is required'
        });
      }

      // Get original content if contentId provided
      let contentText = originalContent;
      if (contentId) {
        const content = await ContentModel.getById(contentId);
        if (!content) {
          return res.status(404).json({
            error: 'content_not_found',
            message: 'Content not found'
          });
        }
        if (content.user_id !== userId) {
          return res.status(403).json({
            error: 'forbidden',
            message: 'You do not have permission to improve this content'
          });
        }
        contentText = content.text_content || content.description || '';
      }

      // Select AI provider
      let aiService;
      if (provider === 'anthropic' && anthropicService.isAvailable()) {
        aiService = anthropicService;
      } else if (openaiService.isAvailable()) {
        aiService = openaiService;
      } else {
        return res.status(503).json({
          error: 'ai_service_unavailable',
          message: 'No AI service is configured or available'
        });
      }

      // Build improvement prompt
      const prompt = promptService.buildImprovementPrompt({
        originalContent: contentText,
        platform: platform || 'instagram',
        improvementType,
        specificFeedback
      });

      // Generate improved content
      let improvedContent;
      try {
        improvedContent = await aiService.generateText({
          prompt,
          systemPrompt: 'You are a content editor that improves social media content while maintaining the original message and intent.',
          temperature: 0.5,
          userId: userId
        });
      } catch (error) {
        logger.error('Content improvement error:', error);
        return res.status(500).json({
          error: 'improvement_failed',
          message: error.message
        });
      }

      // Update content if contentId provided
      if (contentId) {
        await ContentModel.updateMetadata(contentId, {
          improved_at: new Date().toISOString(),
          improvement_type: improvementType,
          original_content: contentText
        });
      }

      res.json({
        success: true,
        improved_content: improvedContent,
        original_content: contentText,
        improvement_type: improvementType,
        provider: provider
      });
    } catch (error) {
      logger.error('Improve content error:', error);
      res.status(500).json({
        error: 'improvement_failed',
        message: error.message
      });
    }
  }
}

module.exports = ContentController;

