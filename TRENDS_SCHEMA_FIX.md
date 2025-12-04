# Trends Research Database Schema Fix - CRITICAL

## 🚨 CRITICAL ISSUE

**Error:** "Could not find the 'brand_context' column"  
**Impact:** Trends research feature completely broken  
**Location:** `/api/trending_topics/bulk` endpoint

## ✅ SOLUTION: Run Database Migration

The database schema is missing columns that the application code expects. You need to run a migration to add these columns.

---

## 📋 STEP 1: Run the Migration in Supabase

### Option A: Using Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `ontoimmnycdgmxkihsss`

2. **Open SQL Editor:**
   - Click **"SQL Editor"** in the left sidebar
   - Click **"New query"**

3. **Run the Migration:**
   - Copy the entire contents of: `backend/migrations/012_update_trending_topics_schema.sql`
   - Paste into the SQL Editor
   - Click **"Run"** (or press `Ctrl+Enter` / `Cmd+Enter`)

4. **Verify Success:**
   - You should see: `Success. No rows returned`
   - Check for any error messages

### Option B: Using Supabase CLI (If you have it set up)

```bash
cd backend
supabase db push
```

Or manually:

```bash
psql -h [your-supabase-host] -U postgres -d postgres -f migrations/012_update_trending_topics_schema.sql
```

---

## 📋 STEP 2: Verify Migration Success

1. **Check Table Structure:**
   - In Supabase SQL Editor, run:
   ```sql
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'trending_topics'
   ORDER BY ordinal_position;
   ```

2. **Expected New Columns:**
   - `title` (TEXT)
   - `source_url` (TEXT)
   - `trending_data` (TEXT)
   - `keywords` (TEXT[])
   - `viral_potential` (INTEGER)
   - `brand_relevance` (TEXT)
   - `brand_context` (TEXT)
   - `duration_estimate` (TEXT)
   - `brand_id` (UUID)
   - `source_date` (TIMESTAMP)
   - `used` (BOOLEAN)
   - `hidden` (BOOLEAN)
   - `is_hidden` (BOOLEAN)
   - `updated_at` (TIMESTAMP)

---

## 📋 STEP 3: Test Trends Research

1. **Test the Feature:**
   - Go to your app: https://prism-five-livid.vercel.app
   - Navigate to **Trends** page
   - Click **"Research Trends"** or wait for automatic research
   - Should work without errors

2. **Check Backend Logs:**
   - In DigitalOcean, go to **Runtime Logs**
   - Look for successful trend creation
   - No more "column not found" errors

---

## ✅ Verification Checklist

- [ ] Migration file created: `backend/migrations/012_update_trending_topics_schema.sql`
- [ ] Migration run in Supabase SQL Editor
- [ ] All new columns verified in database
- [ ] Tested trends research - works without errors
- [ ] No "column not found" errors in backend logs
- [ ] Trends can be created and saved successfully

---

## 🔍 Troubleshooting

### Issue: Migration fails with "column already exists"

**Solution:**
- The migration uses `ADD COLUMN IF NOT EXISTS`, so it's safe to run multiple times
- If you get this error, the column already exists - that's fine!

### Issue: Migration fails with "function does not exist"

**Solution:**
- The migration creates the `update_updated_at_column()` function
- If it fails, run this first:
  ```sql
  CREATE OR REPLACE FUNCTION update_updated_at_column()
  RETURNS TRIGGER AS $$
  BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql;
  ```

### Issue: Still getting "column not found" errors

**Solutions:**
1. **Verify migration ran successfully:**
   - Check Supabase SQL Editor history
   - Verify columns exist using the SQL query in Step 2

2. **Check column names:**
   - Ensure column names match exactly (case-sensitive in some databases)
   - The migration uses lowercase column names

3. **Restart backend:**
   - After migration, restart your DigitalOcean app
   - This ensures the backend picks up the new schema

4. **Check for typos:**
   - Verify the migration SQL is correct
   - Check for any syntax errors

### Issue: Data migration concerns

**Solution:**
- The migration preserves all existing data
- It only adds new columns (all nullable)
- Existing `topic` data is copied to `title` automatically
- No data loss occurs

---

## 📊 What the Migration Does

1. **Adds Missing Columns:**
   - All columns that the application code expects
   - All columns are nullable (optional) to preserve existing data

2. **Data Migration:**
   - Copies `topic` → `title` for existing records
   - Preserves all existing data

3. **Creates Indexes:**
   - Indexes on frequently queried columns
   - Improves query performance

4. **Creates Triggers:**
   - Auto-updates `updated_at` timestamp
   - Ensures data consistency

---

## 🔒 Safety Notes

- **Backup First:** Always backup your database before running migrations
- **Test Environment:** Test the migration in a development environment first
- **Rollback Plan:** Keep a backup of the original schema if needed

---

## 📚 Additional Information

**Migration File Location:**
- `backend/migrations/012_update_trending_topics_schema.sql`

**Related Files:**
- `backend/src/routes/trending_topics.js` - Updated to handle new schema
- `src/pages/Dashboard.jsx` - Frontend that uses these fields
- `src/pages/Trends.jsx` - Trends page component

---

## 🆘 Need Help?

If you're still experiencing issues after running the migration:

1. **Check Supabase Logs:**
   - Look for SQL errors in Supabase dashboard
   - Check query execution history

2. **Verify Column Names:**
   - Use the verification SQL query in Step 2
   - Ensure all columns exist

3. **Check Backend Code:**
   - Verify `backend/src/routes/trending_topics.js` is updated
   - Check for any hardcoded column names

4. **Test Directly:**
   - Try inserting a trend directly in Supabase SQL Editor
   - Verify the insert works with new columns

---

**Once the migration is complete, your trends research feature should work immediately!** 🚀

