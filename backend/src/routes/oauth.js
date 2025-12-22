const router = require('express').Router()
const axios = require('axios')
const { supabaseAdmin } = require('../config/supabase')
const { extractAuth } = require('../middleware/extractAuth')

// Apply auth extraction to all routes to get user context
//router.use(extractAuth)

// TikTok OAuth
router.get('/tiktok', (req, res) => {
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
    let userId = req.user?.uid || null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || userId
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
router.get('/linkedin', (req, res) => {
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
    let userId = req.user?.uid || null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || userId
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
router.get('/google', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile https://www.googleapis.com/auth/youtube.upload',
    access_type: 'offline',
    prompt: 'consent',
    state: Math.random().toString(36).slice(2)
  })
  const url = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  res.redirect(url)
})

router.get('/google/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'missing_code' })

    const tokenRes = await axios.post('https://oauth2.googleapis.com/token', new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID,
      client_secret: process.env.GOOGLE_CLIENT_SECRET,
      redirect_uri: process.env.GOOGLE_CALLBACK_URL,
      grant_type: 'authorization_code'
    }).toString(), { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } })

    const { access_token, refresh_token, expires_in } = tokenRes.data || {}

    let account_name = null
    try {
      const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', { headers: { Authorization: `Bearer ${access_token}` } })
      account_name = userInfo.data?.email || userInfo.data?.name || null
    } catch {}

    await supabaseAdmin.from('oauth_tokens').insert({
      platform: 'google',
      access_token,
      refresh_token,
      expires_in,
      account_name
    })

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=google&connected=true`)
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=google&error=callback_failed`)
  }
})

// Facebook OAuth
router.get('/facebook', (req, res) => {
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
    scope: 'public_profile,email',
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
    let userId = req.user?.uid || null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || userId
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

// Instagram OAuth (uses Meta/Facebook credentials but different API)
router.get('/instagram', (req, res) => {
  console.log('📷 Instagram OAuth initiated');
  
  // Include user ID in state if available
  const state = JSON.stringify({
    random: Math.random().toString(36).slice(2),
    userId: req.user?.uid || null
  });
  
  const params = new URLSearchParams({
    client_id: process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID,
    redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
    response_type: 'code',
    scope: 'user_profile,user_media',
    state: state
  })
  const url = `https://api.instagram.com/oauth/authorize?${params.toString()}`
  console.log('📷 Redirecting to Instagram');
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

    // Extract user ID from state or request
    let userId = req.user?.uid || null
    try {
      const stateData = JSON.parse(state)
      userId = stateData.userId || userId
    } catch {}
    
    if (process.env.NODE_ENV === 'development') {
      console.log('📷 Instagram: Exchanging code for token...');
    }

    // Exchange code for short-lived token
    const params = new URLSearchParams({
      client_id: process.env.INSTAGRAM_CLIENT_ID || process.env.FACEBOOK_APP_ID,
      client_secret: process.env.INSTAGRAM_CLIENT_SECRET || process.env.FACEBOOK_APP_SECRET,
      grant_type: 'authorization_code',
      redirect_uri: process.env.INSTAGRAM_CALLBACK_URL,
      code
    })
    
    const tokenRes = await axios.post('https://api.instagram.com/oauth/access_token', params, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
    })
    const { access_token, user_id } = tokenRes.data || {}
    if (process.env.NODE_ENV === 'development') {
      console.log('✅ Instagram token received');
    }

    // Fetch user profile
    let profile = null
    let platformUsername = null
    
    try {
      console.log('📷 Fetching Instagram user profile...');
      const profileRes = await axios.get(`https://graph.instagram.com/me`, {
        params: { 
          fields: 'id,username,account_type,media_count',
          access_token: access_token 
        }
      })
      profile = profileRes.data || {}
      platformUsername = profile.username || null
      console.log('✅ Instagram profile fetched:', platformUsername);
    } catch (e) {
      console.error('⚠️ Instagram profile fetch failed:', e.message)
      // Try alternate method
      try {
        const altRes = await axios.get(`https://graph.instagram.com/${user_id}`, {
          params: { 
            fields: 'id,username',
            access_token: access_token 
          }
        })
        profile = altRes.data || {}
        platformUsername = profile.username || null
        console.log('✅ Instagram profile fetched (alternate):', platformUsername);
      } catch (e2) {
        console.error('⚠️ Instagram profile fetch (alternate) failed:', e2.message)
      }
    }

    // Instagram tokens expire in 60 days by default
    const expiresAt = new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days

    console.log('💾 Saving Instagram connection to database...');
    if (process.env.NODE_ENV === 'development') {
      console.log('   user_id:', userId);
    }
    console.log('   platform_username:', platformUsername);
    if (process.env.NODE_ENV === 'development') {
      console.log('   platform_user_id:', user_id);
    }

    // Save to social_media_connections
    const { data: connection, error } = await supabaseAdmin
      .from('social_media_connections')
      .insert({
        user_id: userId,
        brand_id: null,
        platform: 'instagram',
        platform_user_id: user_id,
        platform_username: platformUsername,
        access_token: access_token,
        refresh_token: null, // Instagram doesn't provide refresh tokens
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

    console.log('✅ Instagram connection saved successfully:', connection?.id);

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&connected=true`)
  } catch (e) {
    console.error('❌ Instagram OAuth error:', e.response?.data || e.message)
    const errorDetail = e.response?.data?.error_message || e.response?.data?.error?.message || 'callback_failed'
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=instagram&error=${errorDetail}`)
  }
})

module.exports = router