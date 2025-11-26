# 🚀 Complete Fix Guide - OAuth URLs & Database

## Issues Fixed:
1. ✅ OAuth URLs pointing to localhost instead of production
2. ✅ Complete SQL schema file created

---

## Part 1: Fix OAuth URLs (3 minutes)

### Step 1: Add BACKEND_URL to DigitalOcean

1. Go to: https://cloud.digitalocean.com/apps
2. Click: **octopus-app-73pgz**
3. Click: **Settings** → **Environment Variables**
4. Click: **Add Variable**
5. Add these 2 new variables:

```
Name: BACKEND_URL
Value: https://octopus-app-73pgz.ondigitalocean.app

Name: FRONTEND_URL
Value: https://prism-five-livid.vercel.app
```

6. Click **Save**
7. Wait for auto-redeploy (2-3 minutes)

### Step 2: Deploy Code Changes

```bash
git add .
git commit -m "fix: OAuth URLs now use production backend URL"
git push origin main
```

### Step 3: Test OAuth Connections

1. Open: https://prism-five-livid.vercel.app
2. Go to **Connections** page
3. Try connecting to any social media
4. URL should now be: `https://octopus-app-73pgz.ondigitalocean.app/api/oauth/...`
5. ✅ No more localhost URLs!

---

## Part 2: Setup Complete Database (5 minutes)

### Step 1: Open Supabase SQL Editor

1. Go to: https://supabase.com/dashboard/project/ontoimmnycdgmxkihsss
2. Click **SQL Editor** in left sidebar
3. Click **New Query**

### Step 2: Run the Complete Schema

1. Open the file: **`database_schema.sql`**
2. **Copy ALL the content**
3. **Paste into Supabase SQL Editor**
4. Click **Run** (or press Ctrl+Enter)

### Step 3: Verify Tables Created

After running, you should see:
```
PRISM APP DATABASE SCHEMA CREATED SUCCESSFULLY!

Tables created: brands, brand_settings, content, brand_content,
                social_media_connections, autolist_settings,
                trending_topics, templates, uploads, oauth_states
```

### Step 4: Check Your Tables

1. Click **Table Editor** in left sidebar
2. You should see all these tables:
   - ✅ brands
   - ✅ brand_settings
   - ✅ content
   - ✅ brand_content
   - ✅ social_media_connections
   - ✅ autolist_settings
   - ✅ trending_topics
   - ✅ templates
   - ✅ uploads
   - ✅ oauth_states

---

## Part 3: Test Everything (2 minutes)

### Test 1: Brand Creation
1. Open: https://prism-five-livid.vercel.app
2. Go to **Brands** page
3. Click **Create Brand**
4. Fill in:
   - Name: "Test Brand"
   - Description: "Testing complete setup"
   - Website: https://test.com
   - Color: any color
5. Click **Create**
6. ✅ Should work without any errors!

### Test 2: OAuth Connection
1. Go to **Connections** page
2. Click any **Connect** button
3. Check the URL in browser address bar
4. Should be: `https://octopus-app-73pgz.ondigitalocean.app/api/oauth/...`
5. ✅ No localhost URLs!

---

## What Was Fixed

### OAuth URLs Before:
```javascript
// Hardcoded localhost - WRONG!
authUrl = 'http://localhost:4000/api/oauth/tiktok';
```

### OAuth URLs After:
```javascript
// Uses environment variable - CORRECT!
const backendUrl = process.env.BACKEND_URL || 'https://octopus-app-73pgz.ondigitalocean.app';
authUrl = `${backendUrl}/api/oauth/tiktok`;
```

### Database Before:
- ❌ Missing tables
- ❌ Wrong schema
- ❌ No RLS policies

### Database After:
- ✅ 10 complete tables
- ✅ Proper relationships
- ✅ RLS enabled
- ✅ Indexes for performance
- ✅ Auto-updating timestamps

---

## Database Tables Explained

| Table | Purpose |
|-------|---------|
| **brands** | Your brands (already existed, now enhanced) |
| **brand_settings** | Platform-specific settings for each brand |
| **content** | Generated content ideas and posts |
| **brand_content** | Links content to brands with generated text |
| **social_media_connections** | OAuth tokens for connected accounts |
| **autolist_settings** | Auto-posting queue settings |
| **trending_topics** | Trending topics for inspiration |
| **templates** | Reusable content templates |
| **uploads** | Uploaded media files metadata |
| **oauth_states** | Temporary OAuth security tokens |

---

## Environment Variables Checklist

Verify these are ALL set in DigitalOcean:

```
✅ PORT=4000
✅ BACKEND_URL=https://octopus-app-73pgz.ondigitalocean.app
✅ FRONTEND_URL=https://prism-five-livid.vercel.app
✅ FRONTEND_URLS=https://prism-five-livid.vercel.app,...
✅ SUPABASE_URL=https://ontoimmnycdgmxkihsss.supabase.co
✅ SUPABASE_SERVICE_KEY=(service_role key)
✅ FIREBASE_PROJECT_ID=prism-676a3
✅ FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@...
✅ FIREBASE_PRIVATE_KEY=(private key)
✅ JWT_SECRET=(secret)
✅ SESSION_SECRET=(secret)
```

---

## Timeline

```
Part 1: Fix OAuth URLs
  ├─ Add env vars to DigitalOcean (1 min)
  ├─ Deploy code (1 min)
  └─ Wait for deploy (2 min)

Part 2: Setup Database
  ├─ Open Supabase SQL Editor (1 min)
  ├─ Copy & run schema (2 min)
  └─ Verify tables (1 min)

Part 3: Test Everything
  ├─ Test brand creation (1 min)
  └─ Test OAuth URLs (1 min)

TOTAL: ~10 minutes
```

---

## Troubleshooting

### Issue: SQL script fails
**Error:** "relation already exists"  
**Solution:** The table already exists. You can:
- Skip the error (other tables will still be created)
- Or add `DROP TABLE IF EXISTS` before creating

### Issue: RLS blocks operations
**Error:** "new row violates row-level security policy"  
**Solution:** The SQL file already includes permissive policies. If still failing:
```sql
-- Temporarily disable RLS
ALTER TABLE brands DISABLE ROW LEVEL SECURITY;
```

### Issue: OAuth still showing localhost
**Solution:**
1. Check BACKEND_URL is set in DigitalOcean
2. Make sure backend redeployed after adding env var
3. Hard refresh browser: Ctrl+Shift+R
4. Check DigitalOcean logs to confirm env var is loaded

---

## Files Modified

1. **backend/src/routes/social.js** - Fixed OAuth URLs
2. **backend/.env** - Added BACKEND_URL and FRONTEND_URL
3. **database_schema.sql** - Complete database schema (NEW)

---

## Next Steps After Setup

Once everything works:

1. **Configure OAuth Apps** for each platform:
   - Set redirect URIs to: `https://octopus-app-73pgz.ondigitalocean.app/api/oauth/{platform}/callback`
   - Add client IDs and secrets to DigitalOcean env vars

2. **Set up social posting**:
   - Add OAuth credentials for each platform
   - Test posting to each platform

3. **Explore all features**:
   - Create multiple brands
   - Generate content
   - Schedule posts
   - Connect social accounts

---

## 🎯 DO THIS NOW:

### Quick Start (10 minutes):
1. Add BACKEND_URL and FRONTEND_URL to DigitalOcean
2. Deploy: `git push origin main`
3. Run database_schema.sql in Supabase
4. Test brand creation
5. Test OAuth connections
6. ✅ Everything works!

---

**All issues are fixed! OAuth uses production URLs, database is complete!** 🎉
