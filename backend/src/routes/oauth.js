const router = require('express').Router()
const axios = require('axios')
const { supabaseAdmin } = require('../config/supabase')
const { extractAuth } = require('../middleware/extractAuth')

// ========================================
// CRITICAL: extractAuth only on initiation routes, NOT callbacks
// Callbacks are called by external services without auth tokens
// ========================================

// TikTok OAuth
router.get('/tiktok', extractAuth, (req, res) => {
  console.log('🎵 TikTok OAuth initiated');
  
  // Include user ID in state if available
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null
  });
  
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.list,video.upload',
    redirect_uri: process.env.TIKTOK_CALLBACK_URL,
    state: state
  })
  const url = `https://www.tiktok.com/v2/auth/authorize/?${params.toString()}`
  console.log('🎵 Redirecting to TikTok:', url.substring(0, 100) + '...');
  res.redirect(url)
})

router.get('/tiktok/callback', async (req, res) => {
  console.log('🎵 TikTok OAuth callback received');
  
  try {
    const { code, state } = req.query
    
    if (!code) {
      console.error('❌ TikTok callback: Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=tiktok&error=missing_code`)
    }
    
    // Extract user ID from state or request
    let userId = null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || null
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
      console.log('🎵 TikTok: Exchanging code for token...');
    }
    
    // Exchange code for token
    const { data: tokenData } = await axios.post('https://open.tiktokapis.com/v2/oauth/token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.TIKTOK_CALLBACK_URL
    }, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded'
      }
    })

    const { access_token, refresh_token, expires_in, open_id } = tokenData
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ TikTok token received');
    }

    // Fetch user profile
    let profile = null
    let platformUsername = null
    let platformUserId = open_id
    
    try {
      console.log('🎵 Fetching TikTok user profile...');
      const userRes = await axios.get('https://open.tiktokapis.com/v2/user/info/', {
        params: { fields: 'open_id,union_id,avatar_url,display_name' },
        headers: { Authorization: `Bearer ${access_token}` }
      })
      profile = userRes.data?.data?.user || {}
      platformUsername = profile.display_name || null
      platformUserId = profile.open_id || open_id
      console.log('✅ TikTok profile fetched:', platformUsername);
    } catch (e) {
      console.error('⚠️ TikTok profile fetch failed:', e.message)
    }
    
    // Calculate token expiration
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000)
      : null

    console.log('💾 Saving TikTok connection to database...');
    if (process.env.NODE_ENV === 'development') {
      console.log('   user_id:', userId);
    }
    console.log('   platform_username:', platformUsername);
    if (process.env.NODE_ENV === 'development') {
      console.log('   platform_user_id:', platformUserId);
    }

    // Save to social_media_connections
    const { data: connection, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id: userId,
        brand_id: null, // Can be set later when user selects a brand
        platform: 'tiktok',
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token: access_token,
        refresh_token: refresh_token || null,
        token_expires_at: expiresAt,
        profile_data: profile,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ TikTok connection saved successfully:', connection?.id);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=tiktok&connected=true`)
  } catch (e) {
    console.error('❌ TikTok OAuth error:', e.response?.data || e.message)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=tiktok&error=callback_failed`)
  }
})

// LinkedIn OAuth
router.get('/linkedin', extractAuth, (req, res) => {
  console.log('💼 LinkedIn OAuth initiated');
  
  // Include user ID in state if available
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null
  });
  
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    state,
    scope: 'openid profile email w_member_social'
  })
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  console.log('💼 Redirecting to LinkedIn:', url.substring(0, 100) + '...');
  res.redirect(url)
})

router.get('/linkedin/callback', async (req, res) => {
  console.log('💼 LinkedIn OAuth callback received');
  
  try {
    const { code, state } = req.query
    
    if (!code) {
      console.error('❌ LinkedIn callback: Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=linkedin&error=missing_code`)
    }
    
    // Extract user ID from state or request
    let userId = null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || null
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
      console.log('💼 LinkedIn: Exchanging code for token...');
    }
    
    // Exchange code for token
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
      client_id: process.env.LINKEDIN_CLIENT_ID,
      client_secret: process.env.LINKEDIN_CLIENT_SECRET
    })
    const tokenRes = await axios.post('https://www.linkedin.com/oauth/v2/accessToken', params.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const { access_token, expires_in } = tokenRes.data
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ LinkedIn token received');
    }

    // Fetch user profile
    let profile = null
    let platformUsername = null
    let platformUserId = null
    
    try {
      console.log('💼 Fetching LinkedIn user profile...');
      const profileRes = await axios.get('https://api.linkedin.com/v2/userinfo', {
        headers: { Authorization: `Bearer ${access_token}` }
      })
      profile = profileRes.data || {}
      platformUserId = profile.sub || null
      platformUsername = profile.name || profile.email || profile.given_name || null
      console.log('✅ LinkedIn profile fetched:', platformUsername);
    } catch (e) {
      console.error('⚠️ LinkedIn profile fetch failed:', e.message)
    }
    
    // Calculate expiration
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000)
      : null

    console.log('💾 Saving LinkedIn connection to database...');
    if (process.env.NODE_ENV === 'development') {
      console.log('   user_id:', userId);
    }
    console.log('   platform_username:', platformUsername);
    if (process.env.NODE_ENV === 'development') {
      console.log('   platform_user_id:', platformUserId);
    }

    // Save to social_media_connections
    const { data: connection, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id: userId,
        brand_id: null,
        platform: 'linkedin',
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token: access_token,
        refresh_token: null,
        token_expires_at: expiresAt,
        profile_data: profile,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ LinkedIn connection saved successfully:', connection?.id);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=linkedin&connected=true`)
  } catch (e) {
    console.error('❌ LinkedIn OAuth error:', e.response?.data || e.message)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=linkedin&error=callback_failed`)
  }
})

// Google OAuth
router.get('/google', extractAuth, (req, res) => {
  console.log('🔍 Google OAuth initiated');
  
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null
  });
  
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state: state
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  console.log('🔍 Redirecting to Google');
  res.redirect(url)
})

router.get('/google/callback', async (req, res) => {
  console.log('🔍 Google OAuth callback received');
  
  try {
    const { code, state } = req.query
    
    if (!code) {
      console.error('❌ Google callback: Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=google&error=missing_code`)
    }

    // Extract user ID from state
    let userId = null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || null
    } catch {}

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

    const { access_token, refresh_token, expires_in } = tokenRes.data || {}

    let profile = null
    let platformUsername = null
    let platformUserId = null
    
    try {
      const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { 
        headers: { Authorization: `Bearer ${access_token}` } 
      })
      profile = userInfo.data
      platformUserId = profile.sub || null
      platformUsername = profile.email || profile.name || null
      console.log('✅ Google profile fetched:', platformUsername);
    } catch (e) {
      console.error('⚠️ Google profile fetch failed:', e.message)
    }

    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000)
      : null

    // Save to social_media_connections
    const { data: connection, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id: userId,
        brand_id: null,
        platform: 'google',
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token: access_token,
        refresh_token: refresh_token || null,
        token_expires_at: expiresAt,
        profile_data: profile,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ Google connection saved successfully:', connection?.id);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=google&connected=true`)
  } catch (e) {
    console.error('❌ Google OAuth error:', e.response?.data || e.message)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=google&error=callback_failed`)
  }
})

// Facebook OAuth
router.get('/facebook', extractAuth, (req, res) => {
  console.log('📘 Facebook OAuth initiated');
  
  // Include user ID in state if available
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null
  });
  
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
    response_type: 'code',
    scope: 'public_profile,email,pages_show_list',
    state: state
  })
  const url = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  console.log('📘 Redirecting to Facebook');
  res.redirect(url)
})

router.get('/facebook/callback', async (req, res) => {
  console.log('📘 Facebook OAuth callback received');
  
  try {
    const { code, state } = req.query
    
    if (!code) {
      console.error('❌ Facebook callback: Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=facebook&error=missing_code`)
    }

    // Extract user ID from state or request
    let userId = null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || null
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📘 Facebook: Exchanging code for token...');
    }

    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
      code
    })
    const tokenRes = await axios.get(`${tokenUrl}?${params.toString()}`)
    const { access_token, expires_in } = tokenRes.data || {}
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Facebook token received');
    }

    // Fetch user profile
    let profile = null
    let platformUsername = null
    let platformUserId = null
    
    try {
      console.log('📘 Fetching Facebook user profile...');
      const meRes = await axios.get('https://graph.facebook.com/me', { 
        params: { fields: 'id,name,email' }, 
        headers: { Authorization: `Bearer ${access_token}` } 
      })
      profile = meRes.data || {}
      platformUserId = profile.id || null
      platformUsername = profile.name || null
      console.log('✅ Facebook profile fetched:', platformUsername);
    } catch (e) {
      console.error('⚠️ Facebook profile fetch failed:', e.message)
    }

    // Calculate expiration
    const expiresAt = expires_in 
      ? new Date(Date.now() + expires_in * 1000)
      : null

    console.log('💾 Saving Facebook connection to database...');
    if (process.env.NODE_ENV === 'development') {
      console.log('   user_id:', userId);
    }
    console.log('   platform_username:', platformUsername);
    if (process.env.NODE_ENV === 'development') {
      console.log('   platform_user_id:', platformUserId);
    }

    // Save to social_media_connections
    const { data: connection, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id: userId,
        brand_id: null,
        platform: 'facebook',
        platform_user_id: platformUserId,
        platform_username: platformUsername,
        access_token: access_token,
        refresh_token: null,
        token_expires_at: expiresAt,
        profile_data: profile,
        is_active: true
      })
      .select()
      .single()

    if (error) {
      console.error('❌ Database insert error:', error);
      throw error;
    }

    console.log('✅ Facebook connection saved successfully:', connection?.id);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=facebook&connected=true`)
  } catch (e) {
    console.error('❌ Facebook OAuth error:', e.response?.data || e.message)
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=facebook&error=callback_failed`)
  }
})

// ========================================
// INSTAGRAM OAUTH - USES GRAPH API VIA FACEBOOK
// ========================================
router.get('/instagram', extractAuth, (req, res) => {
  console.log('📷 Instagram OAuth initiated (via Facebook Graph API)');
  
  // Include user ID in state if available
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null,
    platform: 'instagram'
  });
  
  // Instagram Graph API requires Facebook OAuth with specific scopes
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID, // Same as Facebook
    redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
    response_type: 'code',
    scope: 'instagram_basic,pages_show_list,pages_read_engagement,business_management', // Graph API scopes
    state: state
  })
  
  // Use Facebook OAuth endpoint (Instagram Graph API uses Facebook login)
  const url = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  console.log('📷 Redirecting to Facebook OAuth for Instagram access');
  res.redirect(url)
})

router.get('/instagram/callback', async (req, res) => {
  console.log('📷 Instagram OAuth callback received');
  
  try {
    const { code, state } = req.query
    
    if (!code) {
      console.error('❌ Instagram callback: Missing authorization code');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&error=missing_code`)
    }

    // Extract user ID from state
    let userId = null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || null
    } catch {}
    
    console.log('📷 Instagram: Exchanging code for Facebook token...');

    // Exchange code for Facebook access token (Graph API flow)
    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
      code
    })
    
    const tokenRes = await axios.get(`${tokenUrl}?${params.toString()}`)
    const { access_token } = tokenRes.data
    console.log('✅ Facebook token received for Instagram access');

    // Get user's Facebook Pages (required for Instagram Graph API)
    console.log('📷 Fetching Facebook Pages...');
    const pagesRes = await axios.get('https://graph.facebook.com/v18.0/me/accounts', {
      params: { access_token }
    })
    
    const pages = pagesRes.data?.data || []
    console.log(`📷 Found ${pages.length} Facebook page(s)`);
    
    if (pages.length === 0) {
      console.error('❌ No Facebook Pages found - Instagram Graph API requires a connected Facebook Page');
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&error=no_facebook_page`)
    }

    // Get Instagram Business Account for each page
    let instagramAccount = null
    let pageAccessToken = null
    
    for (const page of pages) {
      try {
        console.log(`📷 Checking page "${page.name}" for Instagram connection...`);
        
        const igRes = await axios.get(`https://graph.facebook.com/v18.0/${page.id}`, {
          params: { 
            fields: 'instagram_business_account',
            access_token: page.access_token 
          }
        })
        
        if (igRes.data?.instagram_business_account) {
          instagramAccount = igRes.data.instagram_business_account
          pageAccessToken = page.access_token
          console.log(`✅ Found Instagram Business Account: ${instagramAccount.id}`);
          
          // Get Instagram profile info
          console.log('📷 Fetching Instagram profile details...');
          const profileRes = await axios.get(`https://graph.facebook.com/v18.0/${instagramAccount.id}`, {
            params: {
              fields: 'id,username,name,profile_picture_url,followers_count,media_count',
              access_token: pageAccessToken
            }
          })
          
          const profile = profileRes.data
          console.log(`✅ Instagram profile fetched: @${profile.username}`);
          
          // Save connection
          console.log('💾 Saving Instagram connection to database...');
          const { data: connection, error } = await supabaseAdmin
            .from('social_media_connections')
            .insert({
              user_id: userId,
              brand_id: null,
              platform: 'instagram',
              platform_user_id: profile.id,
              platform_username: profile.username || profile.name,
              access_token: pageAccessToken, // Use page access token for API calls
              refresh_token: null,
              token_expires_at: null, // Page tokens can be long-lived
              profile_data: profile,
              is_active: true
            })
            .select()
            .single()

          if (error) {
            console.error('❌ Database insert error:', error);
            throw error;
          }
          
          console.log('✅ Instagram connection saved successfully:', connection?.id);
          return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&connected=true`)
        }
      } catch (e) {
        console.error(`⚠️ Error checking page "${page.name}" for Instagram:`, e.message)
      }
    }
    
    // No Instagram Business Account found on any page
    console.error('❌ No Instagram Business Account found on any Facebook Page');
    console.error('💡 User needs to:');
    console.error('   1. Convert Instagram to Business/Creator account');
    console.error('   2. Connect it to a Facebook Page');
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&error=no_instagram_business_account`)
    
  } catch (e) {
    console.error('❌ Instagram OAuth error:', e.response?.data || e.message)
    const errorDetail = e.response?.data?.error?.message || e.message || 'callback_failed'
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&error=${encodeURIComponent(errorDetail)}`)
  }
})

module.exports = router