const axios = require('axios');
const OAuthState = require('../models/OAuthState');
const SocialMediaConnection = require('../models/SocialMediaConnection');
const { supabaseAdmin } = require('../config/supabase');

/**
 * OAuth Controller
 * Handles OAuth flows for all social media platforms
 */
class OAuthController {
  /**
   * Initiate OAuth connection flow
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async connect(req, res) {
    try {
      const { platform, brandId } = req.body;
      const userId = req.user?.uid || req.body.userId;

      if (!platform) {
        return res.status(400).json({
          error: 'platform_required',
          message: 'Platform is required'
        });
      }

      if (!userId) {
        return res.status(401).json({
          error: 'authentication_required',
          message: 'User authentication required'
        });
      }

      // Validate platform (matching actual schema constraints)
      const supportedPlatforms = ['instagram', 'facebook', 'tiktok', 'linkedin', 'youtube', 'twitter', 'threads'];
      if (!supportedPlatforms.includes(platform.toLowerCase())) {
        return res.status(400).json({
          error: 'unsupported_platform',
          message: `Platform ${platform} is not supported. Supported: ${supportedPlatforms.join(', ')}`
        });
      }

      // Create OAuth state token
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback`;
      const state = await OAuthState.create({
        userId,
        platform: platform.toLowerCase(),
        redirectUrl: redirectUrl
      });

      // Get OAuth URL based on platform
      const authUrl = this.getAuthUrl(platform.toLowerCase(), state.state_token);

      res.json({
        success: true,
        auth_url: authUrl,
        state_token: state.state, // Note: column is 'state' not 'state_token'
        platform: platform.toLowerCase(),
        expires_at: state.expires_at
      });
    } catch (error) {
      console.error('OAuth connect error:', error);
      res.status(500).json({
        error: 'oauth_connect_failed',
        message: error.message
      });
    }
  }

  /**
   * Handle OAuth callback
   * @param {Object} req - Express request
   * @param {Object} res - Express response
   */
  static async callback(req, res) {
    try {
      const { code, state, error: oauthError } = req.query;
      const platform = req.params.platform?.toLowerCase();

      if (oauthError) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=${oauthError}&platform=${platform}`
        );
      }

      if (!code || !state) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=missing_params&platform=${platform}`
        );
      }

      // Verify state token
      let stateData;
      try {
        stateData = await OAuthState.verify(state);
      } catch (error) {
        return res.redirect(
          `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=invalid_state&platform=${platform}`
        );
      }

      // Exchange code for token based on platform
      const tokenData = await this.exchangeCodeForToken(platform, code, stateData);

      // Fetch user profile
      const profile = await this.fetchUserProfile(platform, tokenData.access_token);

      // Create or update connection
      const connection = await this.createConnection({
        userId: stateData.user_id,
        brandId: stateData.brand_id,
        platform,
        tokenData,
        profile
      });

      // Redirect to frontend
      const redirectUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=${platform}&connected=true&connection_id=${connection.id}`;
      res.redirect(redirectUrl);
    } catch (error) {
      console.error('OAuth callback error:', error);
      const platform = req.params.platform?.toLowerCase() || 'unknown';
      res.redirect(
        `${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?error=callback_failed&platform=${platform}`
      );
    }
  }

  /**
   * Get OAuth authorization URL for platform
   * @param {string} platform - Platform name
   * @param {string} stateToken - State token
   * @returns {string} Authorization URL
   */
  static getAuthUrl(platform, stateToken) {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
    const callbackUrl = `${baseUrl}/api/oauth/${platform}/callback`;

    switch (platform) {
      case 'tiktok':
        const tiktokParams = new URLSearchParams({
          client_key: process.env.TIKTOK_CLIENT_KEY,
          response_type: 'code',
          scope: 'user.info.basic,video.list,video.upload',
          redirect_uri: process.env.TIKTOK_CALLBACK_URL || callbackUrl,
          state: stateToken
        });
        return `https://www.tiktok.com/v2/auth/authorize/?${tiktokParams.toString()}`;

      case 'facebook':
        const fbParams = new URLSearchParams({
          client_id: process.env.FACEBOOK_APP_ID,
          redirect_uri: process.env.FACEBOOK_CALLBACK_URL || callbackUrl,
          response_type: 'code',
          scope: 'public_profile,email,pages_manage_posts,pages_read_engagement',
          state: stateToken
        });
        return `https://www.facebook.com/v18.0/dialog/oauth?${fbParams.toString()}`;

      case 'instagram':
        const igParams = new URLSearchParams({
          client_id: process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID,
          redirect_uri: process.env.INSTAGRAM_CALLBACK_URL || callbackUrl,
          response_type: 'code',
          scope: 'user_profile,user_media',
          state: stateToken
        });
        return `https://api.instagram.com/oauth/authorize?${igParams.toString()}`;

      case 'linkedin':
        const linkedinParams = new URLSearchParams({
          response_type: 'code',
          client_id: process.env.LINKEDIN_CLIENT_ID,
          redirect_uri: process.env.LINKEDIN_CALLBACK_URL || callbackUrl,
          state: stateToken,
          scope: 'openid profile email w_member_social'
        });
        return `https://www.linkedin.com/oauth/v2/authorization?${linkedinParams.toString()}`;

      case 'youtube':
        const youtubeParams = new URLSearchParams({
          client_id: process.env.GOOGLE_CLIENT_ID,
          redirect_uri: process.env.GOOGLE_CALLBACK_URL || callbackUrl,
          response_type: 'code',
          scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload',
          access_type: 'offline',
          prompt: 'consent',
          state: stateToken
        });
        return `https://accounts.google.com/o/oauth2/v2/auth?${youtubeParams.toString()}`;

      case 'threads':
        // Threads uses Instagram OAuth
        const threadsParams = new URLSearchParams({
          client_id: process.env.THREADS_CLIENT_ID || process.env.FACEBOOK_APP_ID,
          redirect_uri: process.env.THREADS_CALLBACK_URL || callbackUrl,
          response_type: 'code',
          scope: 'threads_basic,threads_content_publish',
          state: stateToken
        });
        return `https://www.threads.net/oauth/authorize?${threadsParams.toString()}`;

      case 'twitter':
        // Twitter OAuth 2.0
        const twitterParams = new URLSearchParams({
          response_type: 'code',
          client_id: process.env.TWITTER_CLIENT_ID,
          redirect_uri: process.env.TWITTER_CALLBACK_URL || callbackUrl,
          scope: 'tweet.read tweet.write users.read offline.access',
          state: stateToken,
          code_challenge: 'challenge', // PKCE support
          code_challenge_method: 'plain'
        });
        return `https://twitter.com/i/oauth2/authorize?${twitterParams.toString()}`;

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }


  /**
   * Exchange authorization code for access token
   * @param {string} platform - Platform name
   * @param {string} code - Authorization code
   * @param {Object} stateData - State data
   * @returns {Promise<Object>} Token data
   */
  static async exchangeCodeForToken(platform, code, stateData) {
    const baseUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 4000}`;
    const callbackUrl = `${baseUrl}/api/oauth/${platform}/callback`;

    switch (platform) {
      case 'tiktok':
        const { data: tiktokData } = await axios.post(
          'https://open.tiktokapis.com/v2/oauth/token/',
          {
            client_key: process.env.TIKTOK_CLIENT_KEY,
            client_secret: process.env.TIKTOK_CLIENT_SECRET,
            code,
            grant_type: 'authorization_code',
            redirect_uri: process.env.TIKTOK_CALLBACK_URL || callbackUrl
          },
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          access_token: tiktokData.access_token,
          refresh_token: tiktokData.refresh_token,
          expires_in: tiktokData.expires_in
        };

      case 'facebook':
        const { data: fbData } = await axios.get('https://graph.facebook.com/v18.0/oauth/access_token', {
          params: {
            client_id: process.env.FACEBOOK_APP_ID,
            client_secret: process.env.FACEBOOK_APP_SECRET,
            redirect_uri: process.env.FACEBOOK_CALLBACK_URL || callbackUrl,
            code
          }
        });
        return {
          access_token: fbData.access_token,
          expires_in: fbData.expires_in
        };

      case 'instagram':
        const { data: igData } = await axios.post(
          'https://api.instagram.com/oauth/access_token',
          new URLSearchParams({
            client_id: process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID,
            client_secret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.INSTAGRAM_CALLBACK_URL || callbackUrl,
            code
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          access_token: igData.access_token,
          user_id: igData.user_id,
          expires_in: 60 * 24 * 60 * 60 * 1000 // 60 days
        };

      case 'linkedin':
        const { data: linkedinData } = await axios.post(
          'https://www.linkedin.com/oauth/v2/accessToken',
          new URLSearchParams({
            grant_type: 'authorization_code',
            code,
            redirect_uri: process.env.LINKEDIN_CALLBACK_URL || callbackUrl,
            client_id: process.env.LINKEDIN_CLIENT_ID,
            client_secret: process.env.LINKEDIN_CLIENT_SECRET
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          access_token: linkedinData.access_token,
          expires_in: linkedinData.expires_in
        };

      case 'youtube':
        const { data: googleData } = await axios.post(
          'https://oauth2.googleapis.com/token',
          new URLSearchParams({
            code,
            client_id: process.env.GOOGLE_CLIENT_ID,
            client_secret: process.env.GOOGLE_CLIENT_SECRET,
            redirect_uri: process.env.GOOGLE_CALLBACK_URL || callbackUrl,
            grant_type: 'authorization_code'
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          access_token: googleData.access_token,
          refresh_token: googleData.refresh_token,
          expires_in: googleData.expires_in
        };

      case 'threads':
        // Threads uses Instagram OAuth
        const { data: threadsData } = await axios.post(
          'https://api.threads.net/oauth/access_token',
          new URLSearchParams({
            client_id: process.env.THREADS_CLIENT_ID || process.env.FACEBOOK_APP_ID,
            client_secret: process.env.THREADS_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET,
            grant_type: 'authorization_code',
            redirect_uri: process.env.THREADS_CALLBACK_URL || callbackUrl,
            code
          }),
          {
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
          }
        );
        return {
          access_token: threadsData.access_token,
          expires_in: threadsData.expires_in
        };

      case 'twitter':
        // Twitter OAuth 2.0 token exchange
        const twitterTokenRes = await axios.post(
          'https://api.twitter.com/2/oauth2/token',
          new URLSearchParams({
            code,
            grant_type: 'authorization_code',
            client_id: process.env.TWITTER_CLIENT_ID,
            redirect_uri: process.env.TWITTER_CALLBACK_URL || callbackUrl,
            code_verifier: 'challenge' // PKCE
          }),
          {
            headers: { 
              'Content-Type': 'application/x-www-form-urlencoded',
              Authorization: `Basic ${Buffer.from(`${process.env.TWITTER_CLIENT_ID}:${process.env.TWITTER_CLIENT_SECRET}`).toString('base64')}`
            }
          }
        );
        return {
          access_token: twitterTokenRes.data.access_token,
          refresh_token: twitterTokenRes.data.refresh_token,
          expires_in: twitterTokenRes.data.expires_in
        };

      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }


  /**
   * Fetch user profile from platform
   * @param {string} platform - Platform name
   * @param {string} accessToken - Access token
   * @returns {Promise<Object>} User profile
   */
  static async fetchUserProfile(platform, accessToken) {
    switch (platform) {
      case 'tiktok':
        const { data: tiktokProfile } = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
          params: { fields: 'open_id,union_id,avatar_url,display_name' },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return tiktokProfile?.data?.user || {};

      case 'facebook':
        const { data: fbProfile } = await axios.get('https://graph.facebook.com/me', {
          params: { fields: 'id,name,email' },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return fbProfile;

      case 'instagram':
        const { data: igProfile } = await axios.get('https://graph.instagram.com/me', {
          params: { fields: 'id,username,account_type,media_count', access_token: accessToken }
        });
        return igProfile;

      case 'linkedin':
        const { data: linkedinProfile } = await axios.get('https://api.linkedin.com/v2/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return linkedinProfile;

      case 'youtube':
        const { data: googleProfile } = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return googleProfile;

      case 'threads':
        // Threads profile fetch
        const { data: threadsProfile } = await axios.get('https://graph.threads.net/me', {
          params: { fields: 'id,username', access_token: accessToken }
        });
        return threadsProfile;

      case 'twitter':
        const { data: twitterProfile } = await axios.get('https://api.twitter.com/2/users/me', {
          params: { 'user.fields': 'id,name,username,profile_image_url' },
          headers: { Authorization: `Bearer ${accessToken}` }
        });
        return twitterProfile?.data || {};

      default:
        return {};
    }
  }


  /**
   * Create or update social media connection
   * @param {Object} params - Connection parameters
   * @returns {Promise<Object>} Connection object
   */
  static async createConnection({ userId, brandId, platform, tokenData, profile }) {
    // Check if connection already exists
    const existing = await SocialMediaConnection.getByUserAndPlatform(userId, platform);

    // Extract scopes from token data if available
    const scopes = tokenData.scope 
      ? (Array.isArray(tokenData.scope) ? tokenData.scope : tokenData.scope.split(','))
      : [];

    const connectionData = {
      user_id: userId,
      brand_id: brandId,
      platform: platform,
      platform_user_id: profile.id || profile.open_id || profile.sub || null,
      platform_username: profile.name || profile.username || profile.display_name || profile.email || null,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      token_expires_at: tokenData.expires_in
        ? new Date(Date.now() + tokenData.expires_in * 1000).toISOString()
        : null,
      scopes: scopes,
      profile_data: profile,
      is_active: true
    };

    if (existing) {
      // Update existing connection
      return await SocialMediaConnection.update(existing.id, connectionData);
    } else {
      // Create new connection
      return await SocialMediaConnection.create(connectionData);
    }
  }
}

module.exports = OAuthController;

