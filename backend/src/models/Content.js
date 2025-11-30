const { supabaseAdmin } = require('../config/supabase');

/**
 * Content Model
 * Manages content CRUD operations matching actual Supabase schema
 */
class ContentModel {
  /**
   * Create new content
   * @param {Object} params - Content parameters
   * @returns {Promise<Object>} Created content
   */
  static async create(params) {
    const {
      user_id,
      brand_id,
      title,
      description,
      content_type,
      status = 'draft',
      source,
      text_content,
      media_urls = [],
      scheduled_for,
      platform,
      metadata = {}
    } = params;

    if (!user_id) {
      throw new Error('user_id is required');
    }

    // Ensure metadata is a valid object (not null/undefined)
    const safeMetadata = metadata && typeof metadata === 'object' ? metadata : {};

    const { data, error } = await supabaseAdmin
      .from('content')
      .insert({
        user_id,
        brand_id: brand_id || null,
        title: title || null,
        description: description || null,
        content_type: content_type || null,
        status,
        source: source || null,
        text_content: text_content || null,
        media_urls: Array.isArray(media_urls) && media_urls.length > 0 ? media_urls : null,
        scheduled_for: scheduled_for || null,
        platform: platform || null,
        metadata: safeMetadata
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create content: ${error.message}`);
    }

    return data;
  }

  /**
   * Get content by ID
   * @param {string} contentId - Content ID
   * @returns {Promise<Object>} Content data
   */
  static async getById(contentId) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('id', contentId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get content by user ID
   * @param {string} userId - User ID
   * @param {Object} filters - Optional filters
   * @returns {Promise<Array>} Array of content
   */
  static async getByUserId(userId, filters = {}) {
    let query = supabaseAdmin
      .from('content')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null);

    if (filters.status) {
      query = query.eq('status', filters.status);
    }

    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.content_type) {
      query = query.eq('content_type', filters.content_type);
    }

    query = query.order('created_at', { ascending: false });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch content: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update content
   * @param {string} contentId - Content ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated content
   */
  static async update(contentId, updates) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .update(updates)
      .eq('id', contentId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update content: ${error.message}`);
    }

    return data;
  }

  /**
   * Update content status (workflow state)
   * @param {string} contentId - Content ID
   * @param {string} status - New status
   * @returns {Promise<Object>} Updated content
   */
  static async updateStatus(contentId, status) {
    const validStatuses = [
      'draft',
      'researched',
      'text_generated',
      'visuals_generated',
      'completed_draft',
      'scheduled',
      'posted',
      'failed',
      'archived'
    ];

    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status: ${status}. Must be one of: ${validStatuses.join(', ')}`);
    }

    return this.update(contentId, { status });
  }

  /**
   * Add media URLs to content
   * @param {string} contentId - Content ID
   * @param {Array<string>} mediaUrls - Media URLs to add
   * @returns {Promise<Object>} Updated content
   */
  static async addMedia(contentId, mediaUrls) {
    const content = await this.getById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    const existingUrls = content.media_urls || [];
    const newUrls = Array.isArray(mediaUrls) ? mediaUrls : [mediaUrls];
    const updatedUrls = [...existingUrls, ...newUrls];

    return this.update(contentId, { media_urls: updatedUrls });
  }

  /**
   * Update content metadata
   * @param {string} contentId - Content ID
   * @param {Object} metadata - Metadata to merge
   * @returns {Promise<Object>} Updated content
   */
  static async updateMetadata(contentId, metadata) {
    const content = await this.getById(contentId);
    if (!content) {
      throw new Error('Content not found');
    }

    const existingMetadata = content.metadata || {};
    const updatedMetadata = { ...existingMetadata, ...metadata };

    return this.update(contentId, { metadata: updatedMetadata });
  }

  /**
   * Delete content (soft delete)
   * @param {string} contentId - Content ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(contentId) {
    const { error } = await supabaseAdmin
      .from('content')
      .update({
        deleted_at: new Date().toISOString()
      })
      .eq('id', contentId);

    if (error) {
      throw new Error(`Failed to delete content: ${error.message}`);
    }

    return true;
  }

  /**
   * Get content by brand ID
   * @param {string} brandId - Brand ID
   * @returns {Promise<Array>} Array of content
   */
  static async getByBrandId(brandId) {
    const { data, error } = await supabaseAdmin
      .from('content')
      .select('*')
      .eq('brand_id', brandId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch content: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Create brand_content relationship
   * @param {Object} params - Relationship parameters
   * @returns {Promise<Object>} Created relationship
   */
  static async createBrandContent({ content_id, brand_id, selected_platforms = [], generated_content = {}, status = 'pending' }) {
    const { data, error } = await supabaseAdmin
      .from('brand_content')
      .insert({
        content_id,
        brand_id,
        selected_platforms,
        generated_content,
        status
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create brand_content: ${error.message}`);
    }

    return data;
  }
}

module.exports = ContentModel;

