const router = require('express').Router();
const jwt = require('jsonwebtoken');
const { supabaseAdmin, supabaseClient } = require('../config/supabase');

function getTokenFromReq(req) {
  const authHeader = req.headers.authorization || '';
  if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
  if (req.cookies && req.cookies.auth_token) return req.cookies.auth_token;
  return null;
}

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (error) return res.status(401).json({ error: error.message });
    const token = data.session?.access_token;
    return res.json({ token, user: data.user });
  } catch (e) {
    return res.status(500).json({ error: 'login_failed' });
  }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, ...userData } = req.body;
    const { data, error } = await supabaseAdmin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: userData });
    if (error) return res.status(400).json({ error: error.message });
    const { data: loginData, error: loginError } = await supabaseClient.auth.signInWithPassword({ email, password });
    if (loginError) return res.status(200).json({ user: data.user, token: null });
    const token = loginData.session?.access_token;
    return res.json({ user: loginData.user, token });
  } catch (e) {
    return res.status(500).json({ error: 'register_failed' });
  }
});

router.post('/logout', (req, res) => {
  return res.json({ msg: 'logout successful' });
});

router.get('/me', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    console.log('=== /auth/me Request ===');
    console.log('Token present:', token ? 'yes' : 'no');
    
    if (!token) {
      console.log('Error: No token provided');
      return res.status(401).json({ error: 'no_token', message: 'No authentication token provided' });
    }
    
    // Try Firebase FIRST (since you're using Firebase auth)
    try {
      console.log('Attempting Firebase verification...');
      const admin = require('firebase-admin');
      if (!admin.apps.length) {
        console.log('Initializing Firebase Admin...');
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
          })
        });
      }
      const decoded = await admin.auth().verifyIdToken(token);
      const user = { 
        id: decoded.uid, 
        email: decoded.email, 
        name: decoded.name,
        picture: decoded.picture,
        provider: decoded.firebase?.sign_in_provider 
      };
      console.log('Firebase auth SUCCESS, user ID:', user.id);
      return res.json({ user });
    } catch (fbErr) {
      console.log('Firebase auth failed:', fbErr.message);
    }
    
    // Fallback to Supabase
    try {
      console.log('Attempting Supabase verification...');
      const { data, error } = await supabaseClient.auth.getUser(token);
      if (!error && data?.user) {
        console.log('Supabase auth SUCCESS, user ID:', data.user.id);
        return res.json({ user: data.user });
      }
      if (error) {
        console.log('Supabase auth error:', error.message);
      }
    } catch (sbErr) {
      console.log('Supabase auth failed:', sbErr.message);
    }
    
    console.log('All auth methods failed');
    return res.status(401).json({ 
      error: 'invalid_token',
      message: 'Could not verify authentication token with Firebase or Supabase' 
    });
  } catch (e) {
    console.error('Unexpected error in /auth/me:', e);
    return res.status(500).json({ error: 'me_failed', message: e.message });
  }
});

router.put('/me', async (req, res) => {
  try {
    const token = getTokenFromReq(req);
    if (!token) return res.status(401).json({ error: 'no_token' });

    const { data, error } = await supabaseClient.auth.getUser(token);
    if (!error && data?.user?.id) {
      const userId = data.user.id;
      const updateRes = await supabaseAdmin.auth.admin.updateUserById(userId, {
        user_metadata: req.body || {}
      });
      if (updateRes.error) return res.status(400).json({ error: updateRes.error.message });
      return res.json({ user: updateRes.data?.user || data.user });
    }

    return res.json({ ok: true });
  } catch (e) {
    return res.status(500).json({ error: 'update_me_failed' });
  }
});

module.exports = router;
