const router = require('express').Router()
const { supabaseAdmin } = require('../config/supabase')

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
    const { data, error } = await supabaseAdmin.from('brands').insert(req.body).select('*').single()
    if (error) return res.status(400).json({ error: error.message })
    res.json(data)
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