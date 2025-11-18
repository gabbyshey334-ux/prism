const router = require('express').Router();

router.post('/connect', (req, res) => {
  const { platform } = req.body;
  let authUrl = null;
  switch ((platform || '').toLowerCase()) {
    case 'tiktok':
      authUrl = `${process.env.FRONTEND_URL?.replace(/\/$/, '') || 'http://localhost:5174'}/oauth-callback?platform=tiktok&start=${encodeURIComponent('http://localhost:4000/api/oauth/tiktok')}`;
      authUrl = 'http://localhost:4000/api/oauth/tiktok';
      break;
    case 'linkedin':
      authUrl = 'http://localhost:4000/api/oauth/linkedin';
      break;
    case 'google':
      authUrl = 'http://localhost:4000/api/oauth/google';
      break;
    case 'facebook':
      authUrl = 'http://localhost:4000/api/oauth/facebook';
      break;
    case 'youtube':
      authUrl = 'http://localhost:4000/api/oauth/youtube';
      break;
    default:
      return res.status(400).json({ error: 'unknown_platform' });
  }
  return res.json({ authUrl });
});

const { supabaseAdmin } = require('../config/supabase');

router.post('/post', async (req, res) => {
  try {
    const { platform, content_id, brand_id, status = 'queued', scheduled_at = null } = req.body || {};
    if (!platform) return res.status(400).json({ error: 'missing_platform' });
    const { data, error } = await supabaseAdmin.from('posts').insert({
      platform,
      content_id: content_id || null,
      brand_id: brand_id || null,
      status,
      scheduled_at,
      posted_at: status === 'posted' ? new Date().toISOString() : null,
    }).select('*').single();
    if (error) return res.status(400).json({ error: error.message });
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'post_create_failed' });
  }
});

router.post('/refresh', async (req, res) => {
  try {
    const { platform } = req.body || {};
    if (!platform) return res.status(400).json({ error: 'missing_platform' });
    const { data, error } = await supabaseAdmin.from('oauth_tokens').select('*').eq('platform', platform).order('created_at', { ascending: false }).limit(1).single();
    if (error) return res.status(400).json({ error: error.message });

    // Basic refresh simulation: extend expires_in
    const newExpiresIn = (data.expires_in || 3600) + 3600;
    const { error: updErr } = await supabaseAdmin.from('oauth_tokens').update({ expires_in: newExpiresIn }).eq('id', data.id);
    if (updErr) return res.status(400).json({ error: updErr.message });
    res.json({ ok: true, expires_in: newExpiresIn });
  } catch (e) {
    res.status(500).json({ error: 'token_refresh_failed' });
  }
});

module.exports = router;
