const axios = require('axios');
const rateLimiter = require('./rateLimiter');

/**
 * OpenAI Service
 * Handles GPT-4 text generation and DALL-E 3 image generation
 */
class OpenAIService {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.baseURL = 'https://api.openai.com/v1';
    this.defaultModel = process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.imageModel = process.env.OPENAI_IMAGE_MODEL || 'dall-e-3';
    
    if (!this.apiKey) {
      console.warn('⚠️ OpenAI API key not configured');
    }
  }

  /**
   * Check rate limit before making request
   * @param {string} userId - User ID
   * @param {string} type - Request type ('text' or 'image')
   * @returns {Promise<Object>} Rate limit status
   */
  async checkRateLimit(userId, type = 'text') {
    const service = type === 'image' ? 'image' : 'openai';
    return await rateLimiter.checkRateLimit(service, userId);
  }

  /**
   * Generate text using GPT-4
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt to generate from
   * @param {string} params.systemPrompt - Optional system prompt
   * @param {number} params.temperature - Temperature (0-2)
   * @param {number} params.maxTokens - Max tokens to generate
   * @param {Object} params.responseFormat - Optional response format (JSON schema)
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<string>} Generated text
   */
  async generateText({
    prompt,
    systemPrompt = 'You are a helpful assistant that creates engaging social media content.',
    temperature = 0.7,
    maxTokens = 1000,
    responseFormat = null,
    userId = 'global'
  }) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check rate limit
    const rateLimit = await this.checkRateLimit(userId, 'text');
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      const messages = [];
      
      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }
      
      messages.push({ role: 'user', content: prompt });

      const requestBody = {
        model: this.defaultModel,
        messages,
        temperature,
        max_tokens: maxTokens
      };

      // Add response format if specified
      if (responseFormat) {
        requestBody.response_format = responseFormat;
      }

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        requestBody,
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 60000 // 60 second timeout
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No content generated from OpenAI');
      }

      return content;
    } catch (error) {
      if (error.response?.status === 429) {
        // Update rate limiter on API rate limit
        await rateLimiter.resetRateLimit('openai', userId);
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (error.response?.status === 401) {
        throw new Error('OpenAI API key is invalid');
      }
      throw new Error(`OpenAI API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Generate JSON response using GPT-4
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt
   * @param {Object} params.schema - JSON schema for response
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSON({ prompt, schema, systemPrompt = null, userId = 'global' }) {
    const responseFormat = {
      type: 'json_object'
    };

    const fullPrompt = `${prompt}\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(schema)}`;

    const text = await this.generateText({
      prompt: fullPrompt,
      systemPrompt: systemPrompt || 'You are a helpful assistant that returns valid JSON.',
      responseFormat,
      temperature: 0.2,
      userId
    });

    try {
      return JSON.parse(text);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      }
      throw new Error('Failed to parse JSON response from OpenAI');
    }
  }

  /**
   * Generate image using DALL-E 3
   * @param {Object} params - Image generation parameters
   * @param {string} params.prompt - Image description
   * @param {string} params.size - Image size (1024x1024, 1792x1024, 1024x1792)
   * @param {string} params.quality - Image quality (standard, hd)
   * @param {string} params.style - Image style (vivid, natural)
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<Object>} Image data with URL
   */
  async generateImage({
    prompt,
    size = '1024x1024',
    quality = 'standard',
    style = 'vivid',
    userId = 'global'
  }) {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Check rate limit
    const rateLimit = await this.checkRateLimit(userId, 'image');
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/images/generations`,
        {
          model: this.imageModel,
          prompt: prompt,
          n: 1,
          size: size,
          quality: quality,
          style: style,
          response_format: 'url'
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          },
          timeout: 120000 // 2 minute timeout for image generation
        }
      );

      const imageUrl = response.data?.data?.[0]?.url;
      if (!imageUrl) {
        throw new Error('No image URL returned from OpenAI');
      }

      return {
        url: imageUrl,
        revised_prompt: response.data?.data?.[0]?.revised_prompt || prompt,
        provider: 'openai',
        model: this.imageModel
      };
    } catch (error) {
      if (error.response?.status === 429) {
        // Update rate limiter on API rate limit
        await rateLimiter.resetRateLimit('image', userId);
        throw new Error('OpenAI rate limit exceeded. Please try again later.');
      }
      if (error.response?.status === 400) {
        throw new Error(`OpenAI image generation error: ${error.response?.data?.error?.message || 'Invalid request'}`);
      }
      throw new Error(`OpenAI image generation error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Check if service is available
   * @returns {boolean}
   */
  isAvailable() {
    return !!this.apiKey;
  }
}

module.exports = new OpenAIService();

