const axios = require('axios');
const openaiService = require('../ai/openai');
const anthropicService = require('../ai/anthropic');
const logger = require('../../workers/logger');

/**
 * Trend Research Service
 * Discovers and researches trends from multiple sources
 */
class TrendResearchService {
  constructor() {
    this.sources = {
      reddit: !!process.env.REDDIT_CLIENT_ID,
      news: !!process.env.NEWS_API_KEY,
      googleTrends: true, // Public API
      twitter: !!process.env.TWITTER_BEARER_TOKEN
    };
  }

  /**
   * Discover trends from multiple sources
   * @param {Object} params - Discovery parameters
   * @param {string} params.category - Category filter
   * @param {string} params.platform - Platform filter
   * @param {number} params.limit - Number of trends to return
   * @returns {Promise<Array>} Array of discovered trends
   */
  async discoverTrends({ category = null, platform = null, limit = 20 }) {
    const trends = [];

    try {
      // Discover from Reddit
      if (this.sources.reddit) {
        const redditTrends = await this.discoverFromReddit({ category, limit: Math.ceil(limit / 4) });
        trends.push(...redditTrends);
      }

      // Discover from News API
      if (this.sources.news) {
        const newsTrends = await this.discoverFromNews({ category, limit: Math.ceil(limit / 4) });
        trends.push(...newsTrends);
      }

      // Discover from Google Trends
      const googleTrends = await this.discoverFromGoogleTrends({ category, limit: Math.ceil(limit / 4) });
      trends.push(...googleTrends);

      // Discover from Twitter/X (if available)
      if (this.sources.twitter) {
        const twitterTrends = await this.discoverFromTwitter({ category, limit: Math.ceil(limit / 4) });
        trends.push(...twitterTrends);
      }

      // Deduplicate and limit
      const uniqueTrends = this.deduplicateTrends(trends);
      return uniqueTrends.slice(0, limit);
    } catch (error) {
      logger.error('Trend discovery error:', error);
      throw new Error(`Failed to discover trends: ${error.message}`);
    }
  }

  /**
   * Discover trends from Reddit
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} Reddit trends
   */
  async discoverFromReddit({ category = null, limit = 5 }) {
    try {
      const subreddits = this.getSubredditsForCategory(category);
      const trends = [];

      for (const subreddit of subreddits.slice(0, 3)) {
        try {
          const response = await axios.get(
            `https://www.reddit.com/r/${subreddit}/hot.json`,
            {
              params: { limit: 10 },
              headers: {
                'User-Agent': 'PRISM-TrendBot/1.0'
              },
              timeout: 10000
            }
          );

          const posts = response.data?.data?.children || [];
          for (const post of posts.slice(0, limit)) {
            const data = post.data;
            if (data.score > 100) { // Only trending posts
              trends.push({
                topic: data.title,
                description: data.selftext?.substring(0, 500) || '',
                source: 'reddit',
                source_url: `https://reddit.com${data.permalink}`,
                platform: 'general',
                category: category || this.categorizeTopic(data.title),
                volume: data.score,
                engagement: data.num_comments,
                keywords: this.extractKeywords(data.title + ' ' + (data.selftext || '')),
                metadata: {
                  subreddit: subreddit,
                  author: data.author,
                  created_utc: data.created_utc
                }
              });
            }
          }
        } catch (error) {
          logger.warn(`Reddit discovery failed for ${subreddit}:`, error.message);
        }
      }

      return trends;
    } catch (error) {
      logger.error('Reddit discovery error:', error);
      return [];
    }
  }

  /**
   * Discover trends from News API
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} News trends
   */
  async discoverFromNews({ category = null, limit = 5 }) {
    try {
      if (!process.env.NEWS_API_KEY) {
        return [];
      }

      const response = await axios.get('https://newsapi.org/v2/top-headlines', {
        params: {
          apiKey: process.env.NEWS_API_KEY,
          category: category || 'general',
          pageSize: limit,
          country: 'us'
        },
        timeout: 10000
      });

      const articles = response.data?.articles || [];
      return articles.map(article => ({
        topic: article.title,
        description: article.description || '',
        source: 'news',
        source_url: article.url,
        platform: 'general',
        category: category || this.categorizeTopic(article.title),
        volume: 0, // News API doesn't provide volume
        engagement: 0,
        keywords: this.extractKeywords(article.title + ' ' + (article.description || '')),
        metadata: {
          publishedAt: article.publishedAt,
          source: article.source?.name,
          author: article.author
        }
      }));
    } catch (error) {
      logger.error('News API discovery error:', error);
      return [];
    }
  }

  /**
   * Discover trends from Google Trends
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} Google Trends data
   */
  async discoverFromGoogleTrends({ category = null, limit = 5 }) {
    try {
      // Google Trends doesn't have a public API, so we'll use a workaround
      // For production, consider using a service like pytrends or similar
      // This is a placeholder that returns structured data
      
      // In production, you might use:
      // - Google Trends RSS feeds
      // - Third-party Google Trends APIs
      // - Web scraping (with proper rate limiting)
      
      // For now, return empty array - implement based on your needs
      logger.info('Google Trends discovery - implement based on available service');
      return [];
    } catch (error) {
      logger.error('Google Trends discovery error:', error);
      return [];
    }
  }

  /**
   * Discover trends from Twitter/X
   * @param {Object} params - Discovery parameters
   * @returns {Promise<Array>} Twitter trends
   */
  async discoverFromTwitter({ category = null, limit = 5 }) {
    try {
      if (!process.env.TWITTER_BEARER_TOKEN) {
        return [];
      }

      // Twitter API v2 trending topics
      const response = await axios.get('https://api.twitter.com/2/trends/by/woeid/1', {
        headers: {
          'Authorization': `Bearer ${process.env.TWITTER_BEARER_TOKEN}`
        },
        timeout: 10000
      });

      const trends = response.data?.[0]?.trends || [];
      return trends.slice(0, limit).map(trend => ({
        topic: trend.name,
        description: trend.name, // Twitter trends are just names
        source: 'twitter',
        source_url: trend.url || `https://twitter.com/search?q=${encodeURIComponent(trend.name)}`,
        platform: 'twitter',
        category: category || this.categorizeTopic(trend.name),
        volume: trend.tweet_volume || 0,
        engagement: trend.tweet_volume || 0,
        keywords: this.extractKeywords(trend.name),
        metadata: {
          query: trend.query
        }
      }));
    } catch (error) {
      logger.error('Twitter discovery error:', error);
      return [];
    }
  }

  /**
   * Research a specific trend topic
   * @param {Object} params - Research parameters
   * @param {string} params.topic - Topic to research
   * @param {string} params.platform - Platform filter
   * @returns {Promise<Object>} Research data
   */
  async researchTrend({ topic, platform = null }) {
    try {
      // Use AI to analyze the trend
      const aiService = openaiService.isAvailable() ? openaiService : anthropicService;
      
      if (!aiService.isAvailable()) {
        throw new Error('No AI service available for trend research');
      }

      const researchPrompt = `Research and analyze this trending topic: "${topic}"

Provide comprehensive research including:
1. Why it's trending (context and reasons)
2. Key talking points and angles
3. Target audience who cares about this
4. Best platforms for this content
5. Content ideas that would work
6. Relevant hashtags
7. Potential viral factors
8. Estimated trend duration

Return as JSON with these fields:
- context: Why it's trending
- talking_points: Array of key points
- target_audience: Who this appeals to
- best_platforms: Array of platform names
- content_ideas: Array of content ideas
- hashtags: Array of relevant hashtags
- viral_factors: Array of factors making it viral
- trend_duration: Estimated duration (short/medium/long)`;

      const researchData = await aiService.generateJSON({
        prompt: researchPrompt,
        schema: {
          type: 'object',
          properties: {
            context: { type: 'string' },
            talking_points: { type: 'array', items: { type: 'string' } },
            target_audience: { type: 'string' },
            best_platforms: { type: 'array', items: { type: 'string' } },
            content_ideas: { type: 'array', items: { type: 'string' } },
            hashtags: { type: 'array', items: { type: 'string' } },
            viral_factors: { type: 'array', items: { type: 'string' } },
            trend_duration: { type: 'string' }
          },
          required: ['context', 'talking_points', 'target_audience']
        },
        userId: 'system'
      });

      return {
        topic,
        platform: platform || 'all',
        research_data: researchData,
        researched_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Trend research error:', error);
      throw new Error(`Failed to research trend: ${error.message}`);
    }
  }

  /**
   * Score trend for viral potential (0-100)
   * @param {Object} trend - Trend object
   * @returns {Promise<number>} Viral score (0-100)
   */
  async scoreTrend(trend) {
    try {
      let score = 0;

      // Volume score (0-30 points)
      if (trend.volume) {
        if (trend.volume > 10000) score += 30;
        else if (trend.volume > 5000) score += 25;
        else if (trend.volume > 1000) score += 20;
        else if (trend.volume > 500) score += 15;
        else if (trend.volume > 100) score += 10;
        else score += 5;
      }

      // Engagement score (0-25 points)
      if (trend.engagement) {
        const engagementRatio = trend.engagement / Math.max(trend.volume, 1);
        if (engagementRatio > 0.5) score += 25;
        else if (engagementRatio > 0.3) score += 20;
        else if (engagementRatio > 0.1) score += 15;
        else if (engagementRatio > 0.05) score += 10;
        else score += 5;
      }

      // Recency score (0-20 points) - newer is better
      if (trend.metadata?.created_utc || trend.metadata?.publishedAt) {
        const timestamp = trend.metadata.created_utc 
          ? trend.metadata.created_utc * 1000 
          : new Date(trend.metadata.publishedAt).getTime();
        const ageHours = (Date.now() - timestamp) / (1000 * 60 * 60);
        
        if (ageHours < 1) score += 20;
        else if (ageHours < 6) score += 18;
        else if (ageHours < 24) score += 15;
        else if (ageHours < 48) score += 10;
        else score += 5;
      }

      // AI analysis score (0-25 points)
      try {
        const aiService = openaiService.isAvailable() ? openaiService : anthropicService;
        if (aiService.isAvailable()) {
          const analysisPrompt = `Analyze the viral potential of this trend: "${trend.topic}"

Consider:
- Uniqueness and novelty
- Emotional appeal
- Shareability
- Controversy level
- Timeliness
- Broad appeal

Return a score from 0-25 representing viral potential.`;

          const analysis = await aiService.generateText({
            prompt: analysisPrompt,
            systemPrompt: 'You are a trend analyst. Return only a number from 0-25.',
            maxTokens: 10,
            userId: 'system'
          });

          const aiScore = parseInt(analysis.trim()) || 0;
          score += Math.min(25, Math.max(0, aiScore));
        }
      } catch (error) {
        logger.warn('AI scoring failed, using base score:', error.message);
      }

      // Ensure score is between 0-100
      return Math.min(100, Math.max(0, Math.round(score)));
    } catch (error) {
      logger.error('Trend scoring error:', error);
      return 50; // Default score on error
    }
  }

  /**
   * Extract keywords from text
   * @param {string} text - Text to extract keywords from
   * @returns {Array<string>} Extracted keywords
   */
  extractKeywords(text) {
    if (!text) return [];

    // Simple keyword extraction (can be enhanced with NLP)
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3);

    // Count frequency
    const frequency = {};
    words.forEach(word => {
      frequency[word] = (frequency[word] || 0) + 1;
    });

    // Return top keywords
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([word]) => word);
  }

  /**
   * Categorize topic
   * @param {string} topic - Topic text
   * @returns {string} Category
   */
  categorizeTopic(topic) {
    const categories = {
      technology: ['tech', 'ai', 'software', 'app', 'digital', 'code', 'startup'],
      entertainment: ['movie', 'tv', 'show', 'celebrity', 'music', 'game', 'sport'],
      business: ['business', 'company', 'startup', 'finance', 'money', 'invest'],
      lifestyle: ['health', 'fitness', 'food', 'travel', 'fashion', 'beauty'],
      news: ['news', 'politics', 'world', 'breaking', 'update'],
      education: ['learn', 'education', 'school', 'university', 'study']
    };

    const lowerTopic = topic.toLowerCase();
    for (const [category, keywords] of Object.entries(categories)) {
      if (keywords.some(keyword => lowerTopic.includes(keyword))) {
        return category;
      }
    }

    return 'general';
  }

  /**
   * Get subreddits for category
   * @param {string} category - Category
   * @returns {Array<string>} Subreddit names
   */
  getSubredditsForCategory(category) {
    const subredditMap = {
      technology: ['technology', 'programming', 'webdev', 'startups'],
      entertainment: ['entertainment', 'movies', 'television', 'music'],
      business: ['business', 'entrepreneur', 'startups', 'investing'],
      lifestyle: ['lifestyle', 'fitness', 'food', 'travel'],
      news: ['news', 'worldnews', 'politics'],
      general: ['popular', 'all', 'trending']
    };

    return subredditMap[category] || subredditMap.general;
  }

  /**
   * Deduplicate trends
   * @param {Array} trends - Trends array
   * @returns {Array} Deduplicated trends
   */
  deduplicateTrends(trends) {
    const seen = new Set();
    return trends.filter(trend => {
      const key = trend.topic.toLowerCase().trim();
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }
}

module.exports = new TrendResearchService();

