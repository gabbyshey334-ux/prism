const { createClient } = require('@supabase/supabase-js')

const URL = process.env.SUPABASE_URL || 'https://ontoimmnycdgmxkihsss.supabase.co'
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY || ''
const ANON = process.env.SUPABASE_ANON_KEY || ''

const supabaseAdmin = createClient(URL, SERVICE)
const supabaseClient = createClient(URL, ANON)

module.exports = { supabaseAdmin, supabaseClient }
