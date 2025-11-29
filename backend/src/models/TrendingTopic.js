const { supabaseAdmin } = require('../config/supabase');

/**
 * TrendingTopic Model
 * Manages trending topics matching actual Supabase schema
 */
class TrendingTopicModel {
  /**
   * Create new trending topic
   * @param {Object} params - Topic parameters
   * @returns {Promise<Object>} Created topic
   */
  static async create(params) {
    const {
      user_id,
      platform,
      topic,
      description,
      hashtags = [],
      viral_score = 0,
      relevance_score = 0,
      volume,
      source,
      category,
      expires_at,
      metadata = {}
    } = params;

    if (!topic) {
      throw new Error('topic is required');
    }

    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .insert({
        user_id: user_id || null,
        platform: platform || null,
        topic,
        description: description || null,
        hashtags: hashtags.length > 0 ? hashtags : null,
        viral_score: viral_score || 0,
        relevance_score: relevance_score || 0,
        volume: volume || null,
        source: source || null,
        category: category || null,
        expires_at: expires_at || null,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create trending topic: ${error.message}`);
    }

    // Store metadata separately if needed (can be added to table later)
    if (Object.keys(metadata).length > 0) {
      // Metadata can be stored in a separate table or JSONB column if added
    }

    return data;
  }

  /**
   * Get topic by ID
   * @param {string} topicId - Topic ID
   * @returns {Promise<Object>} Topic data
   */
  static async getById(topicId) {
    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .select('*')
      .eq('id', topicId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get trending topics with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of topics
   */
  static async getTrendingTopics(filters = {}) {
    let query = supabaseAdmin
      .from('trending_topics')
      .select('*');

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    if (filters.user_id !== undefined) {
      if (filters.user_id === null) {
        query = query.is('user_id', null); // Global trends
      } else {
        query = query.eq('user_id', filters.user_id);
      }
    }

    if (filters.min_viral_score) {
      query = query.gte('viral_score', filters.min_viral_score);
    }

    if (filters.min_relevance_score) {
      query = query.gte('relevance_score', filters.min_relevance_score);
    }

    if (filters.source) {
      query = query.eq('source', filters.source);
    }

    // Filter out expired trends
    if (filters.include_expired !== true) {
      query = query.or('expires_at.is.null,expires_at.gt.' + new Date().toISOString());
    }

    // Order by viral score and creation date
    query = query.order('viral_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch trending topics: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update trending topic
   * @param {string} topicId - Topic ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated topic
   */
  static async update(topicId, updates) {
    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .update(updates)
      .eq('id', topicId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update trending topic: ${error.message}`);
    }

    return data;
  }

  /**
   * Update viral score
   * @param {string} topicId - Topic ID
   * @param {number} viralScore - New viral score
   * @returns {Promise<Object>} Updated topic
   */
  static async updateViralScore(topicId, viralScore) {
    return this.update(topicId, {
      viral_score: Math.min(100, Math.max(0, viralScore))
    });
  }

  /**
   * Update relevance score
   * @param {string} topicId - Topic ID
   * @param {number} relevanceScore - New relevance score
   * @returns {Promise<Object>} Updated topic
   */
  static async updateRelevanceScore(topicId, relevanceScore) {
    return this.update(topicId, {
      relevance_score: Math.min(100, Math.max(0, relevanceScore))
    });
  }

  /**
   * Delete expired trends
   * @returns {Promise<number>} Number of deleted trends
   */
  static async cleanupExpired() {
    const { data, error } = await supabaseAdmin
      .from('trending_topics')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      throw new Error(`Failed to cleanup expired trends: ${error.message}`);
    }

    return data?.length || 0;
  }

  /**
   * Search trends by keyword
   * @param {string} keyword - Search keyword
   * @param {Object} filters - Additional filters
   * @returns {Promise<Array>} Matching topics
   */
  static async search(keyword, filters = {}) {
    let query = supabaseAdmin
      .from('trending_topics')
      .select('*')
      .or(`topic.ilike.%${keyword}%,description.ilike.%${keyword}%`);

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.category) {
      query = query.eq('category', filters.category);
    }

    query = query.order('viral_score', { ascending: false })
      .order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to search trends: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get trends by category
   * @param {string} category - Category name
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Topics in category
   */
  static async getByCategory(category, limit = 20) {
    return this.getTrendingTopics({
      category,
      limit,
      include_expired: false
    });
  }

  /**
   * Get trends by platform
   * @param {string} platform - Platform name
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Topics for platform
   */
  static async getByPlatform(platform, limit = 20) {
    return this.getTrendingTopics({
      platform,
      limit,
      include_expired: false
    });
  }

  /**
   * Get top viral trends
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Top viral topics
   */
  static async getTopViral(limit = 20) {
    return this.getTrendingTopics({
      min_viral_score: 70,
      limit,
      include_expired: false
    });
  }
}

module.exports = TrendingTopicModel;

