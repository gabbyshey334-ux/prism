# CE.SDK License Key Setup Guide

## ✅ You Have Your License Key!

Your CE.SDK license key: `cWHrYKyBXfAYRXYSpU4MtaWvvlutTpDk1GiwkXxa7CyGdocXUMV8SBwwwNkCpNru`

## 🚀 Next Steps

### Step 1: Add License Key to DigitalOcean (Production)

1. **Go to DigitalOcean Dashboard**
   - Visit: https://cloud.digitalocean.com/apps
   - Click on your app: `octopus-app-73pgz`

2. **Navigate to Environment Variables**
   - Click on the **Settings** tab
   - Scroll down to **Environment Variables** section
   - Click **Add Variable**

3. **Add the License Key**
   - **Variable Name:** `CESDK_LICENSE_KEY`
   - **Value:** `cWHrYKyBXfAYRXYSpU4MtaWvvlutTpDk1GiwkXxa7CyGdocXUMV8SBwwwNkCpNru`
   - **Scope:** Runtime (or All Components)
   - Click **Save**

4. **Wait for Redeploy**
   - DigitalOcean will automatically redeploy your app (3-5 minutes)
   - Check the **Deployments** tab to confirm deployment is complete

### Step 2: Add License Key to Local Development (Optional)

If you want to test the editor locally:

1. **Open `backend/.env` file**
   ```bash
   cd backend
   nano .env  # or use your preferred editor
   ```

2. **Add the license key**
   ```env
   CESDK_LICENSE_KEY=cWHrYKyBXfAYRXYSpU4MtaWvvlutTpDk1GiwkXxa7CyGdocXUMV8SBwwwNkCpNru
   ```

3. **Restart your backend server**
   ```bash
   npm run dev
   ```

### Step 3: Verify It's Working

1. **Test the Editor**
   - Go to your app: https://prism-five-livid.vercel.app
   - Navigate to **Dashboard** or **Library**
   - Create or edit content
   - Click **Editor** button
   - The CE.SDK editor should load without license errors

2. **Check Backend Logs**
   - In DigitalOcean, go to **Runtime Logs**
   - Look for any errors related to CE.SDK
   - The editor should initialize successfully

## 🔍 How It Works

The license key is fetched by the frontend from your backend:

1. **Frontend** (`src/components/editor/CESDKEditor.jsx`) calls:
   ```javascript
   await prism.functions.invoke('getCESDKKey')
   ```

2. **Backend** (`backend/src/routes/functions.js`) returns:
   ```javascript
   {
     apiKey: process.env.CESDK_LICENSE_KEY,
     success: true
   }
   ```

3. **CE.SDK** initializes with the license key:
   ```javascript
   const config = {
     license: licenseKey,
     role: 'Creator',
     // ... other config
   };
   ```

## ✅ Verification Checklist

- [ ] Added `CESDK_LICENSE_KEY` to DigitalOcean environment variables
- [ ] DigitalOcean app redeployed successfully
- [ ] Tested editor in production app
- [ ] No license errors in browser console
- [ ] Editor loads and functions correctly

## 🐛 Troubleshooting

### Issue: "License key not configured" error

**Solution:**
- Verify the environment variable name is exactly `CESDK_LICENSE_KEY` (case-sensitive)
- Check that the value was saved correctly (no extra spaces)
- Ensure the app was redeployed after adding the variable

### Issue: Editor doesn't load

**Solution:**
- Check browser console for errors
- Verify the license key is valid and not expired
- Check DigitalOcean runtime logs for backend errors
- Clear browser cache and localStorage

### Issue: License key cached in browser

**Solution:**
- The editor caches the license key in localStorage for 1 hour
- Clear localStorage: `localStorage.removeItem('cesdk_license_key')`
- Refresh the page

## 📚 Additional Resources

- [CE.SDK Documentation](https://docs.img.ly/docs/cesdk)
- [CE.SDK License Management](https://img.ly/docs/cesdk/guides/license-management)

## 🔒 Security Note

**Never commit the license key to Git!**

- The license key is stored in environment variables only
- It's not included in the codebase
- DigitalOcean environment variables are encrypted at rest

---

**Need Help?** Check the backend logs in DigitalOcean or browser console for specific error messages.


