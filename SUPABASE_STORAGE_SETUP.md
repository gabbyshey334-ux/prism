# Supabase Storage Setup Guide - File Uploads

## 🎯 Overview

This guide will help you set up Supabase Storage for file uploads in your PRISM application. All file uploads (images, videos, documents) will be stored in Supabase Storage instead of Firebase.

---

## 📋 STEP 1: Create Supabase Storage Bucket

1. **Go to Supabase Dashboard:**
   - Visit: https://supabase.com/dashboard
   - Select your project: `ontoimmnycdgmxkihsss`

2. **Navigate to Storage:**
   - Click **"Storage"** in the left sidebar
   - Click **"New bucket"**

3. **Create the Bucket:**
   - **Bucket name:** `files`
   - **Public bucket:** ✅ **YES** (check this box)
     - This allows public access to uploaded files via URLs
   - **File size limit:** `50 MB` (or your preferred limit)
   - **Allowed MIME types:** Leave empty (or specify if you want restrictions)
   - Click **"Create bucket"**

4. **Configure Bucket Policies (Important!):**
   - Click on the `files` bucket
   - Go to **"Policies"** tab
   - Click **"New Policy"**

   **Policy 1: Allow authenticated users to upload**
   - **Policy name:** `Allow authenticated uploads`
   - **Allowed operation:** `INSERT`
   - **Policy definition:**
     ```sql
     (bucket_id = 'files'::text) AND (auth.role() = 'authenticated'::text)
     ```
   - Click **"Save policy"**

   **Policy 2: Allow public read access**
   - **Policy name:** `Allow public read`
   - **Allowed operation:** `SELECT`
   - **Policy definition:**
     ```sql
     (bucket_id = 'files'::text)
     ```
   - Click **"Save policy"**

   **Policy 3: Allow users to delete their own files**
   - **Policy name:** `Allow users to delete own files`
   - **Allowed operation:** `DELETE`
   - **Policy definition:**
     ```sql
     (bucket_id = 'files'::text) AND (auth.uid()::text = (storage.foldername(name))[1])
     ```
   - Click **"Save policy"**

---

## 📋 STEP 2: Verify Storage Configuration

1. **Check Bucket Settings:**
   - Bucket name: `files`
   - Public: ✅ Enabled
   - File size limit: 50 MB (or your limit)

2. **Test Upload (Optional):**
   - In Supabase Storage, try uploading a test file
   - Verify you can access it via public URL

---

## 📋 STEP 3: Verify Backend Configuration

The backend is already configured to use Supabase Storage. Verify these environment variables are set in DigitalOcean:

- `SUPABASE_URL` - Your Supabase project URL
- `SUPABASE_SERVICE_KEY` - Supabase service role key (required for admin operations)

---

## 📋 STEP 4: Test File Upload

1. **Test in Your App:**
   - Go to: https://prism-five-livid.vercel.app
   - Navigate to **Dashboard**
   - Click **"Upload Images"** button in the idea input
   - Select an image file
   - Should upload successfully without errors

2. **Check Backend Logs:**
   - In DigitalOcean, go to **Runtime Logs**
   - Look for successful upload messages
   - No "bucket not found" or "permission denied" errors

---

## ✅ Verification Checklist

- [ ] Created `files` bucket in Supabase Storage
- [ ] Bucket is set to **Public**
- [ ] Added INSERT policy for authenticated users
- [ ] Added SELECT policy for public read access
- [ ] Added DELETE policy for users to delete own files
- [ ] Tested file upload in the app
- [ ] Files appear in Supabase Storage
- [ ] Files are accessible via public URLs
- [ ] No errors in backend logs

---

## 🔍 Troubleshooting

### Issue: "Bucket not found" error

**Solution:**
- Verify the bucket name is exactly `files` (case-sensitive)
- Check that the bucket exists in Supabase Storage dashboard
- Ensure `SUPABASE_SERVICE_KEY` is set correctly in DigitalOcean

### Issue: "Permission denied" error

**Solution:**
- Check bucket policies in Supabase
- Ensure INSERT policy allows authenticated users
- Verify SELECT policy allows public read access
- Check that `SUPABASE_SERVICE_KEY` has admin permissions

### Issue: "File too large" error

**Solution:**
- Check bucket file size limit in Supabase
- Increase limit if needed (max 50MB recommended)
- Verify backend `MAX_FILE_SIZE` matches bucket limit

### Issue: Files upload but URLs don't work

**Solution:**
- Ensure bucket is set to **Public**
- Check SELECT policy allows public read
- Verify public URL format is correct
- Test URL directly in browser

### Issue: Upload works but files don't appear in database

**Solution:**
- Check `uploads` table exists in Supabase
- Verify table schema matches expected structure
- Check backend logs for database insert errors
- Ensure `SUPABASE_SERVICE_KEY` has write permissions

---

## 📊 Storage Structure

Files are organized in Supabase Storage as:
```
files/
  └── uploads/
      └── {userId}/
          └── {timestamp}_{filename}
```

Example:
```
files/uploads/KG7Wkpf3NRXCOhFvzRvbVPznRTe2/1703123456789_my_image.jpg
```

---

## 🔒 Security Notes

- **Public Bucket:** Files are publicly accessible via URL
- **User Isolation:** Files are organized by user ID
- **Authentication:** Only authenticated users can upload
- **File Validation:** Backend validates file types and sizes
- **Metadata:** File metadata stored in `uploads` table

---

## 📚 Additional Resources

- [Supabase Storage Documentation](https://supabase.com/docs/guides/storage)
- [Supabase Storage Policies](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase Storage Limits](https://supabase.com/docs/guides/platform/limits)

---

## 🆘 Need Help?

If you're still experiencing issues:

1. **Check Supabase Storage Logs:**
   - Go to Supabase Dashboard → Storage → Logs
   - Look for upload errors

2. **Check Backend Logs:**
   - DigitalOcean Runtime Logs
   - Look for specific error messages

3. **Verify Environment Variables:**
   - Ensure `SUPABASE_SERVICE_KEY` is set correctly
   - Verify key has admin/service role permissions

4. **Test Direct Upload:**
   - Try uploading a file directly in Supabase Storage dashboard
   - Verify bucket permissions work

---

**Once the bucket is created and policies are set, file uploads should work immediately!** 🚀

