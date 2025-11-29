const { supabaseAdmin } = require('../config/supabase');

/**
 * SocialMediaConnection Model
 * Manages social media platform connections
 */
class SocialMediaConnection {
  /**
   * Create a new social media connection
   * @param {Object} params - Connection parameters
   * @returns {Promise<Object>} Created connection
   */
  static async create(params) {
    const {
      user_id,
      brand_id,
      platform,
      platform_user_id,
      platform_username,
      access_token,
      refresh_token,
      token_expires_at,
      scopes,
      profile_data,
      is_active = true
    } = params;

    // Validate required fields
    if (!user_id || !platform || !access_token) {
      throw new Error('Missing required fields: user_id, platform, access_token');
    }

    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id,
        brand_id: brand_id || null,
        platform,
        platform_user_id: platform_user_id || null,
        platform_username: platform_username || null,
        access_token,
        refresh_token: refresh_token || null,
        token_expires_at: token_expires_at || null,
        scopes: scopes || [],
        profile_data: profile_data || {},
        is_active,
        last_used_at: new Date().toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create connection: ${error.message}`);
    }

    return data;
  }

  /**
   * Get connection by ID
   * @param {string} connectionId - Connection ID
   * @returns {Promise<Object>} Connection data
   */
  static async getById(connectionId) {
    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .select('*')
      .eq('id', connectionId)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Get connections by brand ID
   * @param {string} brandId - Brand ID
   * @returns {Promise<Array>} Array of connections
   */
  static async getByBrandId(brandId) {
    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .select('*')
      .eq('brand_id', brandId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get connections by user ID
   * @param {string} userId - User ID
   * @returns {Promise<Array>} Array of connections
   */
  static async getByUserId(userId) {
    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch connections: ${error.message}`);
    }

    return data || [];
  }

  /**
   * Get connection by user and platform
   * @param {string} userId - User ID
   * @param {string} platform - Platform name
   * @returns {Promise<Object>} Connection data
   */
  static async getByUserAndPlatform(userId, platform) {
    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .select('*')
      .eq('user_id', userId)
      .eq('platform', platform)
      .eq('is_active', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      return null;
    }

    return data;
  }

  /**
   * Update connection
   * @param {string} connectionId - Connection ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated connection
   */
  static async update(connectionId, updates) {
    const { data, error } = await supabaseAdmin
      .from('social_media_connections')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId)
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to update connection: ${error.message}`);
    }

    return data;
  }

  /**
   * Delete connection (soft delete by setting is_active to false)
   * @param {string} connectionId - Connection ID
   * @returns {Promise<boolean>} Success status
   */
  static async delete(connectionId) {
    const { error } = await supabaseAdmin
      .from('social_media_connections')
      .update({
        is_active: false,
        updated_at: new Date().toISOString()
      })
      .eq('id', connectionId);

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`);
    }

    return true;
  }

  /**
   * Hard delete connection
   * @param {string} connectionId - Connection ID
   * @returns {Promise<boolean>} Success status
   */
  static async hardDelete(connectionId) {
    const { error } = await supabaseAdmin
      .from('social_media_connections')
      .delete()
      .eq('id', connectionId);

    if (error) {
      throw new Error(`Failed to delete connection: ${error.message}`);
    }

    return true;
  }

  /**
   * Refresh access token
   * @param {string} connectionId - Connection ID
   * @param {string} newAccessToken - New access token
   * @param {string} newRefreshToken - New refresh token (optional)
   * @param {Date} expiresAt - New expiration date (optional)
   * @returns {Promise<Object>} Updated connection
   */
  static async refreshToken(connectionId, newAccessToken, newRefreshToken = null, expiresAt = null) {
    const updates = {
      access_token: newAccessToken,
      last_used_at: new Date().toISOString()
    };

    if (newRefreshToken) {
      updates.refresh_token = newRefreshToken;
    }

    if (expiresAt) {
      updates.token_expires_at = expiresAt instanceof Date ? expiresAt.toISOString() : expiresAt;
    }

    return this.update(connectionId, updates);
  }

  /**
   * Update last used timestamp
   * @param {string} connectionId - Connection ID
   * @returns {Promise<Object>} Updated connection
   */
  static async updateLastUsed(connectionId) {
    return this.update(connectionId, {
      last_used_at: new Date().toISOString()
    });
  }

  /**
   * Check if token is expired
   * @param {Object} connection - Connection object
   * @returns {boolean} True if expired
   */
  static isTokenExpired(connection) {
    if (!connection.token_expires_at) {
      return false; // No expiration set
    }

    const expiresAt = new Date(connection.token_expires_at);
    return expiresAt < new Date();
  }
}

module.exports = SocialMediaConnection;

