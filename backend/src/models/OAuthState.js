const { supabaseAdmin } = require('../config/supabase');
const crypto = require('crypto');
const { v5: uuidv5 } = require('uuid');
const UID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

/**
 * OAuthState Model
 * Manages OAuth state tokens for CSRF protection
 * State tokens expire after 10 minutes
 * Matches actual Supabase schema: oauth_states table
 */
class OAuthState {
  /**
   * Create a new OAuth state token
   * @param {Object} params - State parameters
   * @param {string} params.userId - User ID (UUID)
   * @param {string} params.platform - Platform name
   * @param {string} params.redirectUrl - Optional redirect URL
   * @returns {Promise<Object>} State token object
   */
  static async create({ userId, platform, redirectUrl = null }) {
    // Generate secure random state token
    const stateToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const userUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(userId))
      ? String(userId)
      : uuidv5(String(userId), UID_NAMESPACE);

    const { data, error } = await supabaseAdmin
      .from('oauth_states')
      .insert({
        state: stateToken, // Note: column is 'state' not 'state_token'
        user_id: userUuid,
        platform: platform,
        redirect_url: redirectUrl,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create OAuth state: ${error.message}`);
    }

    return data;
  }

  /**
   * Verify and consume an OAuth state token
   * @param {string} stateToken - State token to verify
   * @returns {Promise<Object>} State data if valid
   */
  static async verify(stateToken) {
    if (!stateToken) {
      throw new Error('State token is required');
    }

    const { data, error } = await supabaseAdmin
      .from('oauth_states')
      .select('*')
      .eq('state', stateToken) // Note: column is 'state' not 'state_token'
      .single();

    if (error || !data) {
      throw new Error('Invalid state token');
    }

    // Check expiration
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      // Delete expired token
      await supabaseAdmin
        .from('oauth_states')
        .delete()
        .eq('state', stateToken);
      throw new Error('State token has expired');
    }

    // Delete token after use (one-time use)
    await supabaseAdmin
      .from('oauth_states')
      .delete()
      .eq('state', stateToken);

    return data;
  }

  /**
   * Clean up expired state tokens
   * @returns {Promise<number>} Number of deleted tokens
   */
  static async cleanupExpired() {
    const { data, error } = await supabaseAdmin
      .from('oauth_states')
      .delete()
      .lt('expires_at', new Date().toISOString())
      .select();

    if (error) {
      console.error('Failed to cleanup expired OAuth states:', error);
      return 0;
    }

    return data?.length || 0;
  }

  /**
   * Get state by token without consuming it
   * @param {string} stateToken - State token
   * @returns {Promise<Object>} State data
   */
  static async getByToken(stateToken) {
    const { data, error } = await supabaseAdmin
      .from('oauth_states')
      .select('*')
      .eq('state', stateToken) // Note: column is 'state' not 'state_token'
      .single();

    if (error || !data) {
      return null;
    }

    // Check expiration
    const expiresAt = new Date(data.expires_at);
    if (expiresAt < new Date()) {
      return null;
    }

    return data;
  }
}

module.exports = OAuthState;
