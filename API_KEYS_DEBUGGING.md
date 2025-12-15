# API Keys Debugging Guide

## 🚨 Current Issue

After adding AI API keys to DigitalOcean, the backend is still reporting:
- "Neither OpenAI nor Google Gemini API is configured or available"
- HTTP 500 errors on `/api/integrations/llm`

## ✅ What I Fixed

1. **Trending Topics Error**: Fixed the `null value in column "topic"` error by ensuring both `title` and `topic` are always set when creating trends.

2. **Enhanced API Key Debugging**: Added detailed logging to help diagnose why API keys aren't being detected.

## 🔍 How to Debug API Keys Issue

### Step 1: Check Backend Logs

After deploying, check your DigitalOcean backend logs. You should now see detailed output like:

```
🤖 AI Service Configuration:
  OpenAI Key Present: ✅ YES or ❌ NO
  OpenAI Key Length: 51 (should be ~50-60 for OpenAI keys)
  OpenAI Key Preview: sk-proj...
  Google Key Present: ✅ YES or ❌ NO
  Google Key Length: 39 (should be ~39 for Google keys)
  Google Key Preview: AIzaSy...
  Environment Variables Check:
    process.env.OPENAI_API_KEY: SET or NOT SET
    process.env.GOOGLE_API_KEY: SET or NOT SET
    process.env.GOOGLE_AI_API_KEY: SET or NOT SET
```

### Step 2: Verify Environment Variables in DigitalOcean

1. **Go to DigitalOcean Dashboard:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click on your app: **`octopus-app-73pgz`**

2. **Check Environment Variables:**
   - Click the **Settings** tab
   - Scroll to **Environment Variables** section
   - Verify these variables exist:
     - `OPENAI_API_KEY` (should start with `sk-` and be ~50-60 characters)
     - `GOOGLE_API_KEY` (should start with `AIzaSy` and be ~39 characters)
     - OR `GOOGLE_AI_API_KEY` (alternative name)

3. **Common Issues:**
   - ❌ **Variable name typo**: Check for extra spaces, wrong capitalization
   - ❌ **Value has extra spaces**: Make sure there are no leading/trailing spaces
   - ❌ **Value is empty**: The value field should contain the actual API key
   - ❌ **Scope is wrong**: Should be "Runtime" or "All Components"

### Step 3: Restart/Redeploy Backend

**IMPORTANT:** After adding or modifying environment variables:

1. **DigitalOcean should auto-redeploy**, but if it doesn't:
   - Go to **Deployments** tab
   - Click **"Redeploy"** or **"Force Rebuild"**
   - Wait 3-5 minutes for deployment to complete

2. **Check deployment logs** to ensure:
   - Environment variables are loaded
   - Backend starts successfully
   - You see the AI Service Configuration log output

### Step 4: Test API Endpoint Directly

You can test if the API keys are working by making a direct request:

```bash
# Test OpenAI (if configured)
curl -X POST https://octopus-app-73pgz.ondigitalocean.app/api/integrations/llm \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{"prompt": "Hello, test"}'
```

Check the response - if API keys are working, you'll get a JSON response. If not, you'll see the error with debug info.

### Step 5: Check Error Response Debug Info

When the API returns a 500 error, check the response body. It now includes debug information:

```json
{
  "error": "AI service unavailable",
  "message": "Neither OpenAI nor Google Gemini API is configured or available",
  "debug": {
    "openai_configured": false,
    "google_configured": false,
    "openai_key_length": 0,
    "google_key_length": 0,
    "env_check": {
      "OPENAI_API_KEY": "NOT SET",
      "GOOGLE_API_KEY": "NOT SET",
      "GOOGLE_AI_API_KEY": "NOT SET"
    }
  }
}
```

This will tell you exactly which environment variables are missing.

## 🔧 Common Solutions

### Solution 1: Variable Name Mismatch

**Problem:** Variable name doesn't match what the code expects.

**Fix:** Ensure variable names are EXACTLY:
- `OPENAI_API_KEY` (all caps, underscores)
- `GOOGLE_API_KEY` (all caps, underscores)
- OR `GOOGLE_AI_API_KEY` (alternative)

### Solution 2: Backend Not Restarted

**Problem:** Environment variables added but backend wasn't restarted.

**Fix:** 
1. Go to DigitalOcean → Your App → Deployments
2. Click **"Redeploy"** or **"Force Rebuild"**
3. Wait for deployment to complete

### Solution 3: Wrong Scope

**Problem:** Environment variable scope is set incorrectly.

**Fix:**
1. Edit the environment variable
2. Set scope to **"Runtime"** or **"All Components"**
3. Save and redeploy

### Solution 4: API Key Invalid

**Problem:** API key is set but invalid (expired, wrong key, etc.)

**Fix:**
1. Verify the API key is correct:
   - OpenAI: Check at https://platform.openai.com/api-keys
   - Google: Check at https://aistudio.google.com/app/apikey
2. Generate a new key if needed
3. Update in DigitalOcean
4. Redeploy

## 📋 Verification Checklist

- [ ] Environment variables added in DigitalOcean
- [ ] Variable names are correct (no typos)
- [ ] Variable values are correct (no extra spaces)
- [ ] Scope is set to "Runtime" or "All Components"
- [ ] Backend has been redeployed after adding variables
- [ ] Backend logs show API keys are detected
- [ ] Test API call returns success (not 500 error)

## 🆘 Still Not Working?

If after following all steps the issue persists:

1. **Check backend logs** for the detailed AI Service Configuration output
2. **Share the debug info** from the error response
3. **Verify** the API keys work by testing them directly:
   - OpenAI: `curl https://api.openai.com/v1/models -H "Authorization: Bearer YOUR_KEY"`
   - Google: Test at https://aistudio.google.com/app/apikey

## 📝 Next Steps

Once API keys are working:
1. Test content generation on Dashboard
2. Test idea processing
3. Test trend research
4. Test AI agents on Brainstorm page

