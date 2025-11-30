const router = require('express').Router();

router.post('/connect', (req, res) => {
  const { platform } = req.body;
  const backendUrl = process.env.BACKEND_URL || process.env.API_URL || 'https://octopus-app-73pgz.ondigitalocean.app';
  let authUrl = null;
  
  const token = req.headers.authorization?.replace('Bearer ', '');
  switch ((platform || '').toLowerCase()) {
    case 'tiktok':
      authUrl = `${backendUrl}/api/oauth/tiktok${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'linkedin':
      authUrl = `${backendUrl}/api/oauth/linkedin${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'google':
      authUrl = `${backendUrl}/api/oauth/google${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'facebook':
      authUrl = `${backendUrl}/api/oauth/facebook${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'youtube':
      authUrl = `${backendUrl}/api/oauth/youtube${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'instagram':
      authUrl = `${backendUrl}/api/oauth/instagram${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    case 'twitter':
    case 'x':
      authUrl = `${backendUrl}/api/oauth/twitter${token ? `?token=${encodeURIComponent(token)}` : ''}`;
      break;
    default:
      return res.status(400).json({ error: 'unknown_platform' });
  }
  
  console.log(`OAuth connect for ${platform}: ${authUrl}`);
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
