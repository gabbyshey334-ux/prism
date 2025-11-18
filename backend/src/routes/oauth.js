const router = require('express').Router()
const axios = require('axios')
const { supabaseAdmin } = require('../config/supabase')

router.get('/tiktok', (req, res) => {
  const params = new URLSearchParams({
    client_key: process.env.TIKTOK_CLIENT_KEY,
    response_type: 'code',
    scope: 'user.info.basic,video.list,video.upload',
    redirect_uri: process.env.TIKTOK_CALLBACK_URL,
    state: Math.random().toString(36).slice(2)
  })
  const url = `https://www.tiktok.com/authorize?${params.toString()}`
  res.redirect(url)
})

router.get('/tiktok/callback', async (req, res) => {
  try {
    const { code, state } = req.query
    const { data } = await axios.post('https://open-api.tiktok.com/oauth/access_token/', {
      client_key: process.env.TIKTOK_CLIENT_KEY,
      client_secret: process.env.TIKTOK_CLIENT_SECRET,
      code, grant_type: 'authorization_code'
    })
    await supabaseAdmin.from('oauth_tokens').insert({
      platform: 'tiktok',
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in
    })
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: 'tiktok_oauth_failed' })
  }
})

module.exports = router
 
// LinkedIn OAuth
router.get('/linkedin', (req, res) => {
  const state = Math.random().toString(36).slice(2)
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.LINKEDIN_CLIENT_ID,
    redirect_uri: process.env.LINKEDIN_CALLBACK_URL,
    state,
    scope: 'r_emailaddress r_liteprofile w_member_social'
  })
  const url = `https://www.linkedin.com/oauth/v2/authorization?${params.toString()}`
  res.redirect(url)
})

router.get('/linkedin/callback', async (req, res) => {
  try {
    const { code } = req.query
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
    await supabaseAdmin.from('oauth_tokens').insert({ platform: 'linkedin', access_token, expires_in })
    res.json({ success: true })
  } catch (e) {
    res.status(400).json({ error: 'linkedin_oauth_failed' })
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
  const params = new URLSearchParams({
    client_id: process.env.FACEBOOK_APP_ID,
    redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
    response_type: 'code',
    scope: 'public_profile,email',
    state: Math.random().toString(36).slice(2)
  })
  const url = `https://www.facebook.com/v18.0/dialog/oauth?${params.toString()}`
  res.redirect(url)
})

router.get('/facebook/callback', async (req, res) => {
  try {
    const { code } = req.query
    if (!code) return res.status(400).json({ error: 'missing_code' })

    const tokenUrl = 'https://graph.facebook.com/v18.0/oauth/access_token'
    const params = new URLSearchParams({
      client_id: process.env.FACEBOOK_APP_ID,
      client_secret: process.env.FACEBOOK_APP_SECRET,
      redirect_uri: process.env.FACEBOOK_CALLBACK_URL,
      code
    })
    const tokenRes = await axios.get(`${tokenUrl}?${params.toString()}`)
    const { access_token, expires_in } = tokenRes.data || {}

    let account_name = null
    try {
      const meRes = await axios.get('https://graph.facebook.com/me', { params: { fields: 'id,name,email' }, headers: { Authorization: `Bearer ${access_token}` } })
      account_name = meRes.data?.name || null
    } catch {}

    await supabaseAdmin.from('oauth_tokens').insert({
      platform: 'facebook',
      access_token,
      refresh_token: null,
      expires_in,
      account_name
    })

    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=facebook&connected=true`)
  } catch (e) {
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/oauth-callback?provider=facebook&error=callback_failed`)
  }
})