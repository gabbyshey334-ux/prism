const axios = require('axios');
const rateLimiter = require('./rateLimiter');

/**
 * Anthropic Claude Service
 * Handles text generation using Claude API
 */
class AnthropicService {
  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY;
    this.baseURL = 'https://api.anthropic.com/v1';
    this.defaultModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';
    
    if (!this.apiKey) {
      console.warn('⚠️ Anthropic API key not configured');
    }
  }

  /**
   * Check rate limit before making request
   * @param {string} userId - User ID
   * @returns {Promise<Object>} Rate limit status
   */
  async checkRateLimit(userId) {
    return await rateLimiter.checkRateLimit('anthropic', userId);
  }

  /**
   * Generate text using Claude
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt to generate from
   * @param {string} params.systemPrompt - Optional system prompt
   * @param {number} params.temperature - Temperature (0-1)
   * @param {number} params.maxTokens - Max tokens to generate
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<string>} Generated text
   */
  async generateText({
    prompt,
    systemPrompt = 'You are a helpful assistant that creates engaging social media content.',
    temperature = 0.7,
    maxTokens = 1000,
    userId = 'global'
  }) {
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured');
    }

    // Check rate limit
    const rateLimit = await this.checkRateLimit(userId);
    if (!rateLimit.allowed) {
      throw new Error(`Rate limit exceeded. Retry after ${rateLimit.retryAfter} seconds.`);
    }

    try {
      const response = await axios.post(
        `${this.baseURL}/messages`,
        {
          model: this.defaultModel,
          max_tokens: maxTokens,
          temperature,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ]
        },
        {
          headers: {
            'x-api-key': this.apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
          },
          timeout: 60000
        }
      );

      const content = response.data?.content?.[0]?.text;
      if (!content) {
        throw new Error('No content generated from Anthropic');
      }

      return content;
    } catch (error) {
      if (error.response?.status === 429) {
        // Update rate limiter on API rate limit
        await rateLimiter.resetRateLimit('anthropic', userId);
        throw new Error('Anthropic rate limit exceeded. Please try again later.');
      }
      if (error.response?.status === 401) {
        throw new Error('Anthropic API key is invalid');
      }
      throw new Error(`Anthropic API error: ${error.response?.data?.error?.message || error.message}`);
    }
  }

  /**
   * Generate JSON response using Claude
   * @param {Object} params - Generation parameters
   * @param {string} params.prompt - The prompt
   * @param {Object} params.schema - JSON schema for response
   * @param {string} params.userId - User ID for rate limiting
   * @returns {Promise<Object>} Parsed JSON response
   */
  async generateJSON({ prompt, schema, systemPrompt = null, userId = 'global' }) {
    const fullPrompt = `${prompt}\n\nReturn ONLY valid JSON matching this schema: ${JSON.stringify(schema)}`;

    const text = await this.generateText({
      prompt: fullPrompt,
      systemPrompt: systemPrompt || 'You are a helpful assistant that returns valid JSON.',
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
      throw new Error('Failed to parse JSON response from Anthropic');
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

module.exports = new AnthropicService();

