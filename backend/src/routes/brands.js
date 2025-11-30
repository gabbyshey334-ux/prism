const router = require('express').Router()
const { supabaseAdmin, supabaseClient } = require('../config/supabase')
const { v5: uuidv5 } = require('uuid')
const UID_NAMESPACE = '6ba7b810-9dad-11d1-80b4-00c04fd430c8'

async function getUserId(req) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    
    if (!token) {
      console.log('No token provided in Authorization header')
      return null
    }

    console.log('Attempting to verify token...')
    
    // Try Firebase Admin first (since you're using Firebase auth)
    try {
      const admin = require('firebase-admin')
      if (!admin.apps.length) {
        console.log('Initializing Firebase Admin...')
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n')
          })
        })
      }
      const decoded = await admin.auth().verifyIdToken(token)
      const uid = decoded?.uid
      if (uid) {
        console.log('Firebase auth successful, user ID:', uid)
        return uid
      }
    } catch (firebaseError) {
      console.log('Firebase auth failed:', firebaseError.message)
    }
    
    // Try Supabase as fallback
    try {
      const { data, error } = await supabaseClient.auth.getUser(token)
      if (!error && data?.user?.id) {
        console.log('Supabase auth successful, user ID:', data.user.id)
        return data.user.id
      }
      if (error) {
        console.log('Supabase auth error:', error.message)
      }
    } catch (supabaseError) {
      console.log('Supabase auth failed:', supabaseError.message)
    }
    
    console.log('All auth methods failed')
    return null
  } catch (error) {
    console.error('getUserId error:', error)
    return null
  }
}

router.get('/', async (req, res) => {
  try {
    const { data, error } = await supabaseAdmin.from('brands').select('*').order('created_at', { ascending: false })
    if (error) return res.status(400).json({ error: error.message })
    res.json(data || [])
  } catch (e) {
    res.status(500).json({ error: 'brands_list_failed' })
  }
})

router.post('/', async (req, res) => {
  try {
    console.log('=== Brand Creation Request ===')
    console.log('Headers:', req.headers.authorization ? 'Authorization header present' : 'No authorization header')
    console.log('Body:', JSON.stringify(req.body))
    
    const userId = await getUserId(req)
    console.log('User ID extracted:', userId || 'null')
    
    const firebaseUid = userId
    const userUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(firebaseUid)
      ? firebaseUid
      : uuidv5(String(firebaseUid), UID_NAMESPACE)

    const payload = {
      user_id: userUuid,
      name: req.body?.name,
      description: req.body?.description || null,
      website_url: req.body?.website_url || null,
      primary_color: req.body?.primary_color || null
    }
    
    if (!payload.name) {
      console.log('Error: Missing brand name')
      return res.status(400).json({ error: 'missing_name', message: 'Brand name is required' })
    }
    
    if (!payload.user_id) {
      console.log('Error: No user ID - unauthorized')
      return res.status(401).json({ 
        error: 'unauthorized', 
        message: 'Authentication failed. Please log in again.',
        details: 'No valid authentication token found'
      })
    }
    
    console.log('Attempting to insert brand into database...')
    const { data, error } = await supabaseAdmin.from('brands').insert(payload).select('*').single()
    
    if (error) {
      console.log('Database error:', error.message)
      return res.status(400).json({ error: error.message })
    }
    
    console.log('Brand created successfully:', data.id)
    res.status(201).json(data)
  } catch (e) {
    console.error('Brand creation exception:', e)
    res.status(500).json({ error: 'brand_create_failed', message: e.message })
  }
})

router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { data, error } = await supabaseAdmin.from('brands').update(req.body).eq('id', id).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
  } catch (e) {
    res.status(500).json({ error: 'brand_update_failed' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params
    const { error } = await supabaseAdmin.from('brands').delete().eq('id', id)
    if (error) return res.status(400).json({ error: error.message })
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: 'brand_delete_failed' })
  }
})

module.exports = router
