const openaiService = require('./openai');

/**
 * Image Generation Service
 * Unified interface for image generation across providers
 */
class ImageGenerationService {
  constructor() {
    this.providers = {
      openai: openaiService
    };
  }

  /**
   * Generate image using best available provider
   * @param {Object} params - Image generation parameters
   * @param {string} params.prompt - Image description
   * @param {string} params.provider - Preferred provider (openai)
   * @param {string} params.size - Image size
   * @param {string} params.quality - Image quality
   * @param {string} params.style - Image style
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<Object>} Image data with URL
   */
  async generateImage({
    prompt,
    provider = 'openai',
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    userId = 'global'
  }) {
    // Try preferred provider first
    if (provider === 'openai' && this.providers.openai.isAvailable()) {
      try {
        return await this.providers.openai.generateImage({
          prompt,
          size,
          quality,
          style,
          userId
        });
      } catch (error) {
        console.error('OpenAI image generation failed:', error.message);
        // Fall through to try other providers
      }
    }

    // Try other available providers
    for (const [providerName, providerService] of Object.entries(this.providers)) {
      if (providerName !== provider && providerService.isAvailable()) {
        try {
          return await providerService.generateImage({
            prompt,
            size,
            quality,
            style,
            userId
          });
        } catch (error) {
          console.error(`${providerName} image generation failed:`, error.message);
          continue;
        }
      }
    }

    throw new Error('No image generation provider is available or configured');
  }

  /**
   * Generate multiple image variations
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - Base prompt
   * @param {number} params.count - Number of variations
   * @param {Array} params.variations - Array of variation prompts
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<Array>} Array of image data
   */
  async generateVariations({
    prompt,
    count = 3,
    variations = [],
    userId = 'global'
  }) {
    const images = [];
    const prompts = variations.length > 0 
      ? variations.slice(0, count)
      : Array(count).fill(prompt);

    for (let i = 0; i < prompts.length; i++) {
      try {
        const image = await this.generateImage({
          prompt: prompts[i],
          size: '1024x1024',
          userId
        });
        images.push({
          ...image,
          variation_index: i
        });
      } catch (error) {
        console.error(`Failed to generate variation ${i}:`, error.message);
        // Continue with other variations
      }
    }

    return images;
  }

  /**
   * Check if any provider is available
   * @returns {boolean}
   */
  isAvailable() {
    return Object.values(this.providers).some(provider => provider.isAvailable());
  }
}

module.exports = new ImageGenerationService();

