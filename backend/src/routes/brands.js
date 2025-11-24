const router = require('express').Router()
const { supabaseAdmin, supabaseClient } = require('../config/supabase')

async function getUserId(req) {
  try {
    const authHeader = req.headers.authorization || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null
    if (!token) return null
    const { data, error } = await supabaseClient.auth.getUser(token)
    if (error) return null
    return data?.user?.id || null
  } catch { return null }
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
    const userId = await getUserId(req)
    const payload = {
      user_id: userId,
      name: req.body?.name,
      description: req.body?.description || null,
      website_url: req.body?.website_url || null,
      primary_color: req.body?.primary_color || null
    }
    if (!payload.name) return res.status(400).json({ error: 'missing_name' })
    if (!payload.user_id) return res.status(401).json({ error: 'unauthorized' })
    const { data, error } = await supabaseAdmin.from('brands').insert(payload).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.status(201).json(data)
  } catch (e) {
    res.status(500).json({ error: 'brand_create_failed' })
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