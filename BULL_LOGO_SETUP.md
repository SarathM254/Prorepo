# Bull Logo Setup Guide

## Overview
The bull logo is used to identify super admin users in the navigation bar and profile page. The logo is stored in Cloudinary and the URL is saved in MongoDB.

## Setup Steps

### Option 1: Using the Upload Page (Recommended)
1. Open `upload-bull-logo.html` in your browser
2. Select or drag and drop the `Bull.png` file
3. Click "Upload to Cloudinary"
4. The logo will be uploaded and the URL will be stored in the database

### Option 2: Manual Upload via API
1. Upload `Bull.png` to Cloudinary manually or use the Cloudinary dashboard
2. Get the secure URL from Cloudinary
3. Store it in the database by calling:
   ```bash
   curl -X PUT https://your-domain.com/api/bull-logo \
     -H "Content-Type: application/json" \
     -d '{"url": "https://res.cloudinary.com/your-cloud/image/upload/v123/bull_logo.png"}'
   ```

### Option 3: Environment Variable (Quick Setup)
Set the `BULL_LOGO_URL` environment variable in Vercel:
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add `BULL_LOGO_URL` with your Cloudinary URL
3. Redeploy the application

## How It Works

1. **Frontend**: When a super admin user is detected, the frontend calls `/api/bull-logo` to get the logo URL
2. **API**: The API checks MongoDB for the stored URL, or falls back to the `BULL_LOGO_URL` environment variable
3. **Fallback**: If no URL is found, the frontend uses the local `Bull.png` file

## Files Modified
- `api/bull-logo.js` - API endpoint to get/store bull logo URL
- `js/views/ProfileView.js` - Fetches logo URL for navigation
- `js/controllers/ProfileController.js` - Fetches logo URL for profile page
- `index.html` & `profile.html` - Image elements with error handling

## Testing
1. Log in as a super admin user
2. Check the bottom navigation - should show bull logo instead of user icon
3. Go to profile page - should show bull logo in the avatar

