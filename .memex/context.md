# Prism App - Project Rules & Conventions

## Tech Stack

### Frontend
- **Framework:** React 18 + Vite
- **Deployment:** Vercel (https://prism-five-livid.vercel.app)
- **State Management:** TanStack Query (React Query)
- **Auth:** Firebase Authentication
- **Storage:** Firebase Storage
- **UI:** Radix UI + Tailwind CSS + shadcn/ui components

### Backend
- **Framework:** Node.js + Express
- **Deployment:** DigitalOcean App Platform (https://octopus-app-73pgz.ondigitalocean.app)
- **Database:** Supabase (PostgreSQL)
- **Auth Verification:** Firebase Admin SDK
- **API Pattern:** RESTful

## Critical Configuration

### Environment Variables

**Frontend (.env):**
```env
VITE_API_BASE_URL=https://octopus-app-73pgz.ondigitalocean.app/api
VITE_SUPABASE_URL=https://ontoimmnycdgmxkihsss.supabase.co
VITE_SUPABASE_ANON_KEY=[anon key]
VITE_FIREBASE_API_KEY=[firebase api key]
VITE_FIREBASE_AUTH_DOMAIN=prism-676a3.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=prism-676a3
VITE_FIREBASE_STORAGE_BUCKET=prism-676a3.firebasestorage.app
```

**Backend (backend/.env + DigitalOcean):**
```env
PORT=4000
BACKEND_URL=https://octopus-app-73pgz.ondigitalocean.app
FRONTEND_URL=https://prism-five-livid.vercel.app
FRONTEND_URLS=https://prism-five-livid.vercel.app,https://prism-app.com,http://localhost:3000

# Supabase - USE SERVICE_ROLE KEY, NOT ANON KEY!
SUPABASE_URL=https://ontoimmnycdgmxkihsss.supabase.co
SUPABASE_ANON_KEY=[anon key for client]
SUPABASE_SERVICE_KEY=[SERVICE ROLE KEY - has admin access]

# Firebase Admin - Required for token verification
FIREBASE_PROJECT_ID=prism-676a3
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@prism-676a3.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY=[full private key with newlines]

# Security
JWT_SECRET=[secret]
SESSION_SECRET=[secret]
OAUTH_STATE_SECRET=[secret]
```

**Vercel Environment Variables:**
- `VITE_API_BASE_URL` - Points to DigitalOcean backend
- All `VITE_*` variables from .env

**DigitalOcean Environment Variables:**
- All backend .env variables
- **CRITICAL:** Must include Firebase credentials for auth to work
- **CRITICAL:** Must use SUPABASE_SERVICE_KEY not ANON key

### API URL Pattern

**NEVER hardcode URLs!** Always use environment variables:

```javascript
// ❌ WRONG
const API_BASE = 'https://api.prism-app.com/api';
const authUrl = 'http://localhost:4000/api/oauth/tiktok';

// ✅ CORRECT
const API_BASE = import.meta.env.VITE_API_BASE_URL || 
  (import.meta.env.PROD ? 'https://octopus-app-73pgz.ondigitalocean.app/api' : 'http://localhost:4000/api');

const backendUrl = process.env.BACKEND_URL || 'https://octopus-app-73pgz.ondigitalocean.app';
const authUrl = `${backendUrl}/api/oauth/tiktok`;
```

## Authentication Pattern

### Frontend (Firebase Auth)
- Users log in with Google (Firebase)
- Frontend gets Firebase ID token
- Token sent in Authorization header: `Bearer <token>`

### Backend (Firebase Admin Verification)
```javascript
// Always verify Firebase tokens FIRST (primary auth method)
// Then fallback to Supabase if needed

async function getUserId(req) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  
  // Try Firebase Admin FIRST
  try {
    const admin = require('firebase-admin');
    if (!admin.apps.length) {
      admin.initializeApp({
        credential: admin.credential.cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
        })
      });
    }
    const decoded = await admin.auth().verifyIdToken(token);
    return decoded.uid; // This is the user_id
  } catch (firebaseError) {
    console.log('Firebase auth failed:', firebaseError.message);
  }
  
  // Fallback to Supabase
  try {
    const { data } = await supabaseClient.auth.getUser(token);
    return data?.user?.id;
  } catch {}
  
  return null;
}
```

### Token Interceptor Pattern
```javascript
// Add to all API requests
api.interceptors.request.use(async (config) => {
  let token = localStorage.getItem('auth_token');
  
  if (!token && firebaseAuth?.currentUser) {
    token = await firebaseAuth.currentUser.getIdToken();
  }
  
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  return config;
});
```

## Database Patterns

### Supabase Keys - CRITICAL!

**Two types of keys:**
1. **ANON key** - Public, read-only, use in FRONTEND only
2. **SERVICE_ROLE key** - Admin access, use in BACKEND only

**Backend MUST use SERVICE_ROLE key for write operations!**

```javascript
// ❌ WRONG - Using anon key in backend
const supabaseAdmin = createClient(URL, ANON_KEY); // Can't write!

// ✅ CORRECT - Using service_role key
const supabaseAdmin = createClient(URL, SERVICE_ROLE_KEY); // Full access
```

### Row Level Security (RLS)

All tables have RLS enabled. Backend bypasses RLS using service_role key:

```sql
-- Enable RLS
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;

-- Create permissive policy for service role
CREATE POLICY "Service role full access" ON brands
  FOR ALL USING (true) WITH CHECK (true);
```

### Schema Pattern

**All tables include:**
- `id UUID PRIMARY KEY DEFAULT gen_random_uuid()`
- `user_id TEXT NOT NULL` - Firebase UID (TEXT, not UUID!)
- `created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()`
- `updated_at TIMESTAMP WITH TIME ZONE` - Auto-updated via trigger

**Foreign keys:**
- Use `ON DELETE CASCADE` for dependent data
- Use `ON DELETE SET NULL` for optional references

**Indexes:**
- Always index `user_id` for user-specific queries
- Index foreign keys
- Index commonly filtered columns (status, platform, etc.)

### Complete Table Schema

See `database_schema.sql` for complete schema including:
- brands, brand_settings, content, brand_content
- social_media_connections, autolist_settings
- trending_topics, templates, uploads, oauth_states

## Error Handling Patterns

### Frontend Mutations

**Always add onError handler:**

```javascript
const createBrandMutation = useMutation({
  mutationFn: (data) => prism.entities.Brand.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['brands'] });
    toast.success("Brand created!");
  },
  onError: (error) => {
    console.error("Brand creation error:", error);
    const message = error.response?.data?.error || 
                   error.response?.data?.message || 
                   error.message || 
                   "Operation failed";
    toast.error(`Error: ${message}`);
  }
});
```

### Backend Error Responses

**Consistent error format:**

```javascript
// 400 - Bad Request (validation error)
return res.status(400).json({ 
  error: 'missing_name', 
  message: 'Brand name is required' 
});

// 401 - Unauthorized (auth failed)
return res.status(401).json({ 
  error: 'unauthorized', 
  message: 'Authentication failed',
  details: 'No valid token found'
});

// 500 - Server Error
return res.status(500).json({ 
  error: 'operation_failed', 
  message: error.message 
});
```

### Logging Pattern

**Backend:**
```javascript
console.log('=== Operation Name ===');
console.log('Input:', JSON.stringify(data));
console.log('User ID:', userId);
// ... operation
console.log('Result:', result);
// OR
console.error('Error:', error.message);
```

**Frontend:**
```javascript
console.log('Creating brand with data:', data);
// ... operation
console.error('Error response:', error.response?.data);
```

## Common Issues & Solutions

### Issue: 401 Unauthorized
**Causes:**
- Firebase credentials missing in backend
- Token expired
- User not logged in
- Wrong token format

**Solutions:**
1. Verify all 3 Firebase env vars set in DigitalOcean
2. Log out and log back in
3. Check Authorization header is sent
4. Check backend logs for specific auth failure

### Issue: 400 Bad Request on database operations
**Causes:**
- Table doesn't exist
- Wrong column names
- Missing required fields
- RLS policy blocking (rare with service_role)

**Solutions:**
1. Check DigitalOcean logs for exact error
2. Verify table exists in Supabase
3. Run `database_schema.sql` to create/fix tables
4. Verify using SUPABASE_SERVICE_KEY not ANON key

### Issue: OAuth URLs showing localhost
**Cause:**
- Hardcoded URLs in code
- BACKEND_URL not set in environment

**Solution:**
1. Add BACKEND_URL env var to DigitalOcean
2. Use `process.env.BACKEND_URL` in OAuth routes
3. Never hardcode localhost or production URLs

### Issue: CORS errors
**Cause:**
- Frontend URL not in FRONTEND_URLS

**Solution:**
- Add frontend URL to FRONTEND_URLS in backend
- Format: comma-separated, no spaces
- Include all environments (dev, staging, prod)

## Deployment Workflow

### Frontend (Vercel)
1. Make code changes
2. Commit: `git add . && git commit -m "message"`
3. Push: `git push origin main`
4. Vercel auto-deploys (1-2 minutes)
5. Check deployment status in Vercel dashboard

### Backend (DigitalOcean)
1. Update environment variables (if needed):
   - Go to App Settings → Environment Variables
   - Click Save → Auto-redeploys
2. Code changes auto-deploy on git push
3. Or manually trigger: Actions → Force Rebuild

### Database (Supabase)
1. Write SQL in `database_schema.sql` or migration file
2. Copy SQL content
3. Go to Supabase → SQL Editor
4. Paste and Run
5. Verify in Table Editor

## Testing Checklist

Before marking a feature complete:

**Authentication:**
- [ ] Can log in with Google
- [ ] Token sent in Authorization header
- [ ] Backend logs show "Firebase auth SUCCESS"
- [ ] /auth/me returns user data

**Brand Operations:**
- [ ] Can create brand (no 401, no 400)
- [ ] Can edit brand
- [ ] Can delete brand
- [ ] Success toasts appear
- [ ] Errors show helpful messages

**OAuth Connections:**
- [ ] URLs use production backend (no localhost)
- [ ] Redirect to correct OAuth provider
- [ ] Can complete OAuth flow
- [ ] Connection stored in database

**General:**
- [ ] No console errors
- [ ] All env vars set in deployment platforms
- [ ] DigitalOcean logs show no errors
- [ ] Works in incognito/private browsing

## Code Style Conventions

### Import Order
1. React imports
2. Third-party libraries
3. UI components
4. API/utils
5. Types/constants

### Component Pattern
```javascript
// Hooks at top
const queryClient = useQueryClient();
const { data, isLoading } = useQuery(...);
const mutation = useMutation(...);

// Handlers
const handleCreate = () => { ... };

// Render
return ( ... );
```

### File Naming
- Components: PascalCase (e.g., `BrandSettings.jsx`)
- Utils: camelCase (e.g., `apiClient.js`)
- Routes: kebab-case (e.g., `brand-settings.js`)
- SQL: snake_case (e.g., `database_schema.sql`)

## Security Best Practices

1. **Never commit secrets** - Use .env files, add to .gitignore
2. **Never expose service_role key** - Backend only
3. **Always verify tokens** - Don't trust client-side auth
4. **Use RLS** - Even with service_role key
5. **Sanitize inputs** - Validate all user inputs
6. **Use HTTPS** - Always in production
7. **Set CORS properly** - Only allow known origins
8. **Rotate secrets** - Periodically update keys

## Useful Commands

```bash
# Frontend development
npm run dev              # Start dev server
npm run build            # Build for production
npm run preview          # Preview production build

# Backend development
cd backend
npm start                # Start server
npm run dev              # Start with nodemon

# Database
# Run in Supabase SQL Editor, not locally

# Git workflow
git add .
git commit -m "feat: description"
git push origin main

# Check backend logs
# DigitalOcean dashboard → Runtime Logs

# Test API directly
curl https://octopus-app-73pgz.ondigitalocean.app/api/health
```

## Documentation Files

After debugging session, keep these files:
- `database_schema.sql` - Complete DB schema
- `QUICK_REFERENCE.md` - URLs and configs
- `README.md` - Project overview

Delete temporary debugging files:
- `FIX_401_ERROR.md`
- `FIX_400_ERROR_NOW.md`
- `SOLVE_401_NOW.md`
- `EMERGENCY_DEPLOY.md`
- `DO_THIS_NOW.md`
- etc.

## Key Learnings from Debugging

1. **Auth errors (401) = Firebase credentials issue** - Always check Firebase env vars first
2. **Database errors (400) = Schema/RLS issue** - Check if table exists and using correct Supabase key
3. **OAuth localhost URLs = Hardcoded URLs** - Always use env vars for backend URL
4. **Service vs Anon key matters!** - Backend needs SERVICE_ROLE key for writes
5. **Log everything during debug** - Detailed logs save hours of debugging
6. **Test in production** - Some issues only appear in deployed environment
7. **Environment variables are critical** - Must be set in BOTH local and deployment platforms

## Emergency Debugging Process

When something breaks:

1. **Check browser console** - See client-side errors
2. **Check DigitalOcean logs** - See server-side errors
3. **Check Network tab** - See request/response details
4. **Identify error type:**
   - 401 = Auth issue (Firebase creds, token)
   - 400 = Validation/database issue
   - 403 = Permission issue (RLS)
   - 500 = Server crash
5. **Add detailed logging** - Console.log everywhere
6. **Test API directly** - Use curl or browser console
7. **Verify env vars** - Check all platforms
8. **Deploy and retest** - Sometimes need fresh deploy

## Contact & Resources

- **Supabase Dashboard:** https://supabase.com/dashboard/project/ontoimmnycdgmxkihsss
- **DigitalOcean Apps:** https://cloud.digitalocean.com/apps
- **Vercel Dashboard:** https://vercel.com/dashboard
- **Firebase Console:** https://console.firebase.google.com/project/prism-676a3

---

**Last Updated:** After fixing OAuth URLs and completing database schema
**Status:** Production-ready, all authentication and database issues resolved
