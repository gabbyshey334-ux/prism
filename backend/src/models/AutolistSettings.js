const { supabaseAdmin } = require('../config/supabase');

/**
 * Autolist Settings Model
 * Manages autolist settings for brands and platforms
 */
class AutolistSettingsModel {
  /**
   * Create autolist settings
   * @param {Object} params - Settings parameters
   * @returns {Promise<Object>} Created settings
   */
  static async create(params) {
    const {
      brand_id,
      platform,
      is_enabled = false,
      post_frequency = null,
      post_times = [],
      timezone = 'UTC',
      queue_content_ids = [],
      auto_schedule = false
    } = params;

    if (!brand_id || !platform) {
      throw new Error('brand_id and platform are required');
    }

    const { data, error } = await supabaseAdmin
      .from('autolist_settings')
      .insert({
        brand_id,
        platform,
        is_enabled,
        post_frequency,
        post_times: post_times.length > 0 ? post_times : null,
        timezone,
        queue_content_ids: queue_content_ids.length > 0 ? queue_content_ids : null,
        auto_schedule,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create autolist settings: ${error.message}`);
    }

    return data;
  }

  /**
   * Get settings by brand and platform
   * @param {string} brandId - Brand ID
   * @param {string} platform - Platform name
   * @returns {Promise<Object|null>} Settings data
   */
  static async getByBrandAndPlatform(brandId, platform) {
    const { data, error } = await supabaseAdmin
      .from('autolist_settings')
      .select('*')
      .eq('brand_id', brandId)
      .eq('platform', platform)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update settings
   * @param {string} settingsId - Settings ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated settings
   */
  static async update(settingsId, updates) {
    const { data, error } = await supabaseAdmin
      .from('autolist_settings')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', settingsId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update autolist settings: ${error.message}`);
    }

    return data;
  }

  /**
   * Get all autolist settings for brand
   * @param {string} brandId - Brand ID
   * @returns {Promise<Array>} Settings array
   */
  static async getByBrand(brandId) {
    const { data, error } = await supabaseAdmin
      .from('autolist_settings')
      .select('*')
      .eq('brand_id', brandId);

    if (error) {
      throw new Error(`Failed to fetch autolist settings: ${error.message}`);
    }

    return data || [];
  }
}

module.exports = AutolistSettingsModel;


