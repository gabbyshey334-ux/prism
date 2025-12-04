# AI API Keys Setup Guide - CRITICAL FIX

## 🚨 CRITICAL ISSUE

**Error:** "Neither OpenAI nor Google Gemini API is configured or available"  
**Impact:** All AI features are broken - content generation, idea processing, trend research

## ✅ SOLUTION: Add AI API Keys to DigitalOcean

You need **at least one** of these API keys configured:
- **OpenAI API Key** (Recommended - Primary)
- **Google Gemini API Key** (Optional - Fallback)

---

## 📋 STEP 1: Get Your OpenAI API Key (Recommended)

### Option A: If you already have an OpenAI account

1. **Go to OpenAI Platform:**
   - Visit: https://platform.openai.com/api-keys
   - Sign in to your account

2. **Create a new API key:**
   - Click **"Create new secret key"**
   - Give it a name (e.g., "Prism Production")
   - Click **"Create secret key"**
   - **COPY THE KEY IMMEDIATELY** (you won't see it again!)

### Option B: If you need to create an OpenAI account

1. **Sign up:**
   - Visit: https://platform.openai.com/signup
   - Create an account
   - Add payment method (required for API access)
   - Add credits to your account

2. **Create API key:**
   - Follow steps in Option A above

**Cost:** OpenAI charges per token usage. `gpt-4o-mini` is very affordable (~$0.15 per 1M input tokens).

---

## 📋 STEP 2: Get Your Google Gemini API Key (Optional Fallback)

### If you want to use Google Gemini as a fallback:

1. **Go to Google AI Studio:**
   - Visit: https://aistudio.google.com/app/apikey
   - Sign in with your Google account

2. **Create API key:**
   - Click **"Create API Key"**
   - Select or create a Google Cloud project
   - Click **"Create API Key in new project"** or select existing project
   - **COPY THE KEY**

**Cost:** Google Gemini has a generous free tier, then pay-as-you-go.

---

## 📋 STEP 3: Add API Keys to DigitalOcean

### Add OpenAI API Key (Required for full functionality):

1. **Go to DigitalOcean Dashboard:**
   - Visit: https://cloud.digitalocean.com/apps
   - Click on your app: **`octopus-app-73pgz`**

2. **Navigate to Environment Variables:**
   - Click the **Settings** tab
   - Scroll down to **Environment Variables** section
   - Click **"Add Variable"**

3. **Add OpenAI API Key:**
   - **Variable Name:** `OPENAI_API_KEY`
   - **Value:** Paste your OpenAI API key (starts with `sk-...`)
   - **Scope:** Runtime (or All Components)
   - Click **"Save"**

4. **Add Optional OpenAI Model Settings:**
   - **Variable Name:** `OPENAI_MODEL`
   - **Value:** `gpt-4o-mini` (or `gpt-4o` for better quality)
   - Click **"Save"**

   - **Variable Name:** `OPENAI_IMAGE_MODEL`
   - **Value:** `dall-e-3` (for image generation)
   - Click **"Save"**

### Add Google Gemini API Key (Optional - Fallback):

1. **In the same Environment Variables section:**
   - Click **"Add Variable"**

2. **Add Google API Key:**
   - **Variable Name:** `GOOGLE_API_KEY`
   - **Value:** Paste your Google Gemini API key
   - **Scope:** Runtime (or All Components)
   - Click **"Save"**

3. **Add Optional Google Model Setting:**
   - **Variable Name:** `GOOGLE_MODEL`
   - **Value:** `gemini-1.5-flash` (or `gemini-1.5-pro` for better quality)
   - Click **"Save"**

---

## 📋 STEP 4: Wait for Redeploy

1. **DigitalOcean will automatically redeploy:**
   - After saving environment variables, DigitalOcean automatically redeploys your app
   - This takes **3-5 minutes**
   - Check the **Deployments** tab to monitor progress

2. **Verify deployment:**
   - Wait until status shows **"LIVE"**
   - Check runtime logs for: `✅ Google Gemini AI initialized` (if Google key added)

---

## 📋 STEP 5: Test AI Functionality

1. **Test Idea Processing:**
   - Go to your app: https://prism-five-livid.vercel.app
   - Navigate to **Dashboard**
   - Enter an idea in the input box
   - Click **"Capture Idea"**
   - Should process without errors

2. **Test Content Generation:**
   - Create or open an idea
   - Click **"Generate Content"**
   - Should generate text content successfully

3. **Check Backend Logs:**
   - In DigitalOcean, go to **Runtime Logs**
   - Look for successful API calls (no 500 errors)
   - Should see successful OpenAI/Gemini responses

---

## ✅ Verification Checklist

- [ ] Added `OPENAI_API_KEY` to DigitalOcean environment variables
- [ ] (Optional) Added `GOOGLE_API_KEY` for fallback
- [ ] (Optional) Added `OPENAI_MODEL` if using custom model
- [ ] (Optional) Added `OPENAI_IMAGE_MODEL` for image generation
- [ ] DigitalOcean app redeployed successfully
- [ ] Tested idea processing - works without errors
- [ ] Tested content generation - works without errors
- [ ] No 500 errors in backend logs

---

## 🔍 Troubleshooting

### Issue: Still getting "AI service unavailable" error

**Solutions:**
1. **Verify API key is correct:**
   - Check for typos or extra spaces
   - Ensure key starts with `sk-` for OpenAI
   - Ensure key is the full key (not truncated)

2. **Check API key permissions:**
   - OpenAI: Ensure key has access to the model you're using
   - Google: Ensure API is enabled in Google Cloud Console

3. **Check billing:**
   - OpenAI: Ensure account has credits/balance
   - Google: Ensure billing is enabled (even for free tier)

4. **Verify environment variable name:**
   - Must be exactly: `OPENAI_API_KEY` (case-sensitive)
   - Must be exactly: `GOOGLE_API_KEY` (case-sensitive)

5. **Check deployment:**
   - Ensure app redeployed after adding variables
   - Check runtime logs for initialization messages

### Issue: API key works but requests fail

**Solutions:**
1. **Check rate limits:**
   - OpenAI has rate limits based on your tier
   - Google has rate limits based on your quota

2. **Check API key scope:**
   - Ensure key has access to the models you're using
   - For OpenAI: `gpt-4o-mini`, `gpt-4o`, `dall-e-3`

3. **Check network/firewall:**
   - DigitalOcean should have outbound internet access
   - No firewall blocking OpenAI/Google API endpoints

### Issue: High costs

**Solutions:**
1. **Use cheaper models:**
   - `gpt-4o-mini` is much cheaper than `gpt-4o`
   - `gemini-1.5-flash` is free tier friendly

2. **Set usage limits:**
   - In OpenAI: Set spending limits in account settings
   - In Google: Set quotas in Cloud Console

3. **Monitor usage:**
   - Check OpenAI usage dashboard
   - Check Google Cloud billing dashboard

---

## 💰 Cost Estimates

### OpenAI (gpt-4o-mini):
- **Input:** ~$0.15 per 1M tokens
- **Output:** ~$0.60 per 1M tokens
- **Typical idea processing:** ~$0.001-0.01 per request
- **Typical content generation:** ~$0.01-0.05 per request

### Google Gemini (gemini-1.5-flash):
- **Free tier:** 15 requests per minute
- **Paid:** Very affordable, similar to OpenAI

**Recommendation:** Start with OpenAI `gpt-4o-mini` for best balance of cost and quality.

---

## 🔒 Security Notes

**NEVER commit API keys to Git!**

- ✅ API keys are stored securely in DigitalOcean environment variables
- ✅ Environment variables are encrypted at rest
- ✅ Keys are only accessible to your app at runtime
- ❌ Never put keys in code or commit to repository

---

## 📚 Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [OpenAI Pricing](https://openai.com/pricing)
- [Google Gemini API Documentation](https://ai.google.dev/docs)
- [Google Gemini Pricing](https://ai.google.dev/pricing)

---

## 🆘 Need Help?

If you're still experiencing issues after following this guide:

1. **Check DigitalOcean Runtime Logs:**
   - Look for specific error messages
   - Check if API keys are being read correctly

2. **Test API keys directly:**
   - Use curl or Postman to test OpenAI/Google APIs
   - Verify keys work outside of the app

3. **Check API status:**
   - OpenAI Status: https://status.openai.com
   - Google Cloud Status: https://status.cloud.google.com

---

**Once you've added the API keys and redeployed, your AI features should work immediately!** 🚀

