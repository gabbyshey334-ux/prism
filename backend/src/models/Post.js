const { supabaseAdmin } = require('../config/supabase');

/**
 * Post Model
 * Manages social media post CRUD operations
 */
class PostModel {
  /**
   * Create new post
   * @param {Object} params - Post parameters
   * @returns {Promise<Object>} Created post
   */
  static async create(params) {
    const {
      user_id,
      brand_id,
      platform,
      content_id,
      status = 'queued',
      scheduled_at,
      connection_id,
      caption,
      media_urls = [],
      hashtags = [],
      mentions = [],
      post_data = {},
      metadata = {}
    } = params;

    if (!user_id || !platform) {
      throw new Error('user_id and platform are required');
    }

    const { data, error } = await supabaseAdmin
      .from('posts')
      .insert({
        user_id,
        brand_id: brand_id || null,
        platform,
        content_id: content_id || null,
        status,
        scheduled_at: scheduled_at || null,
        connection_id: connection_id || null,
        caption: caption || null,
        media_urls: media_urls.length > 0 ? media_urls : null,
        hashtags: hashtags.length > 0 ? hashtags : null,
        mentions: mentions.length > 0 ? mentions : null,
        post_metadata: post_data || null,
        metadata: metadata || null
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create post: ${error.message}`);
    }

    return data;
  }

  /**
   * Get post by ID
   * @param {string} postId - Post ID
   * @returns {Promise<Object>} Post data
   */
  static async getById(postId) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('id', postId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get posts with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of posts
   */
  static async getPosts(filters = {}) {
    let query = supabaseAdmin
      .from('posts')
      .select('*');

    if (filters.content_id) {
      query = query.eq('content_id', filters.content_id);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    if (filters.user_id) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.start_date) {
      query = query.gte('created_at', filters.start_date);
    }

    if (filters.end_date) {
      query = query.lte('created_at', filters.end_date);
    }

    // Ordering
    const orderBy = filters.order_by || 'created_at';
    const ascending = filters.ascending !== false;
    query = query.order(orderBy, { ascending });

    // Pagination
    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch posts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get scheduled posts
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of scheduled posts
   */
  static async getScheduled(filters = {}) {
    let query = supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'queued')
      .not('scheduled_at', 'is', null)
      .gte('scheduled_at', new Date().toISOString());

    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    query = query.order('scheduled_at', { ascending: true });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch scheduled posts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get posts due for publishing
   * @param {number} limit - Maximum number of posts to fetch
   * @returns {Promise<Array>} Array of posts ready to publish
   */
  static async getDuePosts(limit = 10) {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'queued')
      .not('scheduled_at', 'is', null)
      .lte('scheduled_at', now)
      .order('scheduled_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch due posts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update post
   * @param {string} postId - Post ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated post
   */
  static async update(postId, updates) {
    const { data, error } = await supabaseAdmin
      .from('posts')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', postId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update post: ${error.message}`);
    }

    return data;
  }

  /**
   * Update post status
   * @param {string} postId - Post ID
   * @param {string} status - New status
   * @param {Object} additionalData - Additional data to update
   * @returns {Promise<Object>} Updated post
   */
  static async updateStatus(postId, status, additionalData = {}) {
    const validStatuses = [
      'queued',
      'scheduled',
      'processing',
      'publishing',
      'published',
      'failed',
      'cancelled',
      'retry'
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    const updates = {
      status,
      ...additionalData
    };

    if (status === 'published' && !updates.posted_at) {
      updates.posted_at = new Date().toISOString();
    }

    return this.update(postId, updates);
  }

  /**
   * Update post with success data
   * @param {string} postId - Post ID
   * @param {Object} successData - Success data (provider_post_id, engagement_metrics, etc.)
   * @returns {Promise<Object>} Updated post
   */
  static async updateSuccess(postId, successData) {
    const updates = {
      status: 'published',
      posted_at: new Date().toISOString(),
      ...successData
    };

    return this.update(postId, updates);
  }

  /**
   * Update post with error data
   * @param {string} postId - Post ID
   * @param {string} errorMessage - Error message
   * @param {Object} errorData - Additional error data
   * @returns {Promise<Object>} Updated post
   */
  static async updateError(postId, errorMessage, errorData = {}) {
    const post = await this.getById(postId);
    if (!post) {
      throw new Error('Post not found');
    }

    const retryCount = (post.retry_count || 0) + 1;
    const maxRetries = post.max_retries || 3;

    const updates = {
      status: retryCount < maxRetries ? 'retry' : 'failed',
      last_error: errorMessage,
      retry_count: retryCount,
      error_log: post.error_log ? [...(Array.isArray(post.error_log) ? post.error_log : [post.error_log]), { error: errorMessage, ...errorData, timestamp: new Date().toISOString() }] : [{ error: errorMessage, ...errorData, timestamp: new Date().toISOString() }]
    };

    if (retryCount < maxRetries) {
      const retryDelay = post.retry_delay_minutes || 15;
      const nextRetry = new Date();
      nextRetry.setMinutes(nextRetry.getMinutes() + retryDelay);
      updates.next_retry_at = nextRetry.toISOString();
    }

    return this.update(postId, updates);
  }

  /**
   * Delete post
   * @param {string} postId - Post ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(postId) {
    const { error } = await supabaseAdmin
      .from('posts')
      .delete()
      .eq('id', postId);

    if (error) {
      throw new Error(`Failed to delete post: ${error.message}`);
    }

    return true;
  }

  /**
   * Get posts by brand ID
   * @param {string} brandId - Brand ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of posts
   */
  static async getByBrandId(brandId, filters = {}) {
    return this.getPosts({
      brand_id: brandId,
      ...filters
    });
  }

  /**
   * Get posts by user ID
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of posts
   */
  static async getByUserId(userId, filters = {}) {
    return this.getPosts({
      user_id: userId,
      ...filters
    });
  }

  /**
   * Get calendar view of posts
   * @param {string} startDate - Start date (ISO string)
   * @param {string} endDate - End date (ISO string)
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of posts for calendar
   */
  static async getCalendarView(startDate, endDate, filters = {}) {
    let query = supabaseAdmin
      .from('posts')
      .select('*')
      .gte('scheduled_at', startDate)
      .lte('scheduled_at', endDate);

    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    query = query.order('scheduled_at', { ascending: true });

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch calendar posts: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get posts that need retry
   * @param {number} limit - Maximum number of posts
   * @returns {Promise<Array>} Array of posts to retry
   */
  static async getRetryPosts(limit = 10) {
    const now = new Date().toISOString();
    
    const { data, error } = await supabaseAdmin
      .from('posts')
      .select('*')
      .eq('status', 'retry')
      .not('next_retry_at', 'is', null)
      .lte('next_retry_at', now)
      .order('next_retry_at', { ascending: true })
      .limit(limit);

    if (error) {
      throw new Error(`Failed to fetch retry posts: ${error.message}`);
    }

    return data || [];
  }
}

module.exports = PostModel;

