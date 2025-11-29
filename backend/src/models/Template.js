const { supabaseAdmin } = require('../config/supabase');

/**
 * Template Model
 * Manages design templates matching Supabase schema
 */
class TemplateModel {
  /**
   * Create new template
   * @param {Object} params - Template parameters
   * @returns {Promise<Object>} Created template
   */
  static async create(params) {
    const {
      user_id,
      brand_id,
      name,
      description,
      template_type,
      platform,
      content,
      cesdk_design,
      variables = {},
      tags = [],
      is_favorite = false
    } = params;

    if (!name || !content) {
      throw new Error('name and content are required');
    }

    const { data, error } = await supabaseAdmin
      .from('templates')
      .insert({
        user_id,
        brand_id: brand_id || null,
        name,
        description: description || null,
        template_type: template_type || 'design',
        platform: platform || null,
        content,
        cesdk_design: cesdk_design || null,
        variables: Object.keys(variables).length > 0 ? variables : null,
        tags: tags.length > 0 ? tags : null,
        is_favorite: is_favorite || false,
        use_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create template: ${error.message}`);
    }

    return data;
  }

  /**
   * Get template by ID
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Template data
   */
  static async getById(templateId) {
    const { data, error } = await supabaseAdmin
      .from('templates')
      .select('*')
      .eq('id', templateId)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get templates with filters
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Array of templates
   */
  static async getTemplates(filters = {}) {
    let query = supabaseAdmin
      .from('templates')
      .select('*')
      .is('deleted_at', null);

    if (filters.user_id !== undefined) {
      query = query.eq('user_id', filters.user_id);
    }

    if (filters.brand_id) {
      query = query.eq('brand_id', filters.brand_id);
    }

    if (filters.platform) {
      query = query.eq('platform', filters.platform);
    }

    if (filters.template_type) {
      query = query.eq('template_type', filters.template_type);
    }

    if (filters.category) {
      // Category might be in tags or metadata
      query = query.contains('tags', [filters.category]);
    }

    if (filters.is_favorite !== undefined) {
      query = query.eq('is_favorite', filters.is_favorite);
    }

    if (filters.is_public !== undefined) {
      // Assuming public templates have a flag or specific user_id
      // This would need to be added to schema or handled differently
    }

    if (filters.search) {
      query = query.or(`name.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }

    // Order by
    const orderBy = filters.order_by || 'created_at';
    const ascending = filters.ascending !== false;
    query = query.order(orderBy, { ascending });

    if (filters.limit) {
      query = query.limit(filters.limit);
    }

    if (filters.offset) {
      query = query.range(filters.offset, filters.offset + (filters.limit || 50) - 1);
    }

    const { data, error } = await query;

    if (error) {
      throw new Error(`Failed to fetch templates: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Update template
   * @param {string} templateId - Template ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated template
   */
  static async update(templateId, updates) {
    const { data, error } = await supabaseAdmin
      .from('templates')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update template: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete template (soft delete)
   * @param {string} templateId - Template ID
   * @returns {Promise<boolean>} Success
   */
  static async delete(templateId) {
    const { data, error } = await supabaseAdmin
      .from('templates')
      .update({
        deleted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', templateId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to delete template: ${error.message}`);
    }

    return !!data;
  }

  /**
   * Increment use count
   * @param {string} templateId - Template ID
   * @returns {Promise<Object>} Updated template
   */
  static async incrementUseCount(templateId) {
    // Get current count
    const template = await this.getById(templateId);
    if (!template) {
      throw new Error('Template not found');
    }

    return this.update(templateId, {
      use_count: (template.use_count || 0) + 1
    });
  }

  /**
   * Get public templates
   * @param {Object} filters - Filter parameters
   * @returns {Promise<Array>} Public templates
   */
  static async getPublicTemplates(filters = {}) {
    // For now, return templates with use_count > threshold as "popular"
    // In production, you'd have an is_public flag
    const publicFilters = {
      ...filters,
      min_use_count: 5, // Popular templates
      order_by: 'use_count',
      ascending: false
    };

    return this.getTemplates(publicFilters);
  }

  /**
   * Get templates by category
   * @param {string} category - Category name
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Templates in category
   */
  static async getByCategory(category, limit = 20) {
    return this.getTemplates({
      category,
      limit,
      order_by: 'use_count',
      ascending: false
    });
  }

  /**
   * Get templates by platform
   * @param {string} platform - Platform name
   * @param {number} limit - Number of results
   * @returns {Promise<Array>} Templates for platform
   */
  static async getByPlatform(platform, limit = 20) {
    return this.getTemplates({
      platform,
      limit,
      order_by: 'use_count',
      ascending: false
    });
  }
}

module.exports = TemplateModel;


