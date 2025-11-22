# Google OAuth Setup Instructions

## Overview
This guide will help you set up Google OAuth authentication for your Proto application. Users can now login with either their email/password or their Google account, and both methods sync to the same user database.

## Prerequisites
- Google Cloud Console account
- Access to Vercel environment variables

## Step 1: Create Google OAuth Credentials

1. **Go to Google Cloud Console**
   - Visit: https://console.cloud.google.com/
   - Create a new project or select an existing one

2. **Enable Google+ API**
   - Go to "APIs & Services" > "Library"
   - Search for "Google+ API" and enable it
   - Also enable "People API" if available

3. **Create OAuth 2.0 Credentials**
   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "OAuth client ID"
   - If prompted, configure the OAuth consent screen first:
     - User Type: External (unless you have Google Workspace)
     - App name: Proto
     - User support email: Your email
     - Developer contact: Your email
     - Add scopes: `email`, `profile`
   - Application type: Web application
   - Name: Proto Web Client
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://your-domain.vercel.app` (your production domain)
   - Authorized redirect URIs:
     - `http://localhost:3000/api/auth/google` (for local development)
     - `https://your-domain.vercel.app/api/auth/google` (your production domain)
   - Click "Create"
   - **Copy the Client ID and Client Secret**

## Step 2: Set Environment Variables in Vercel

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Go to "Settings" > "Environment Variables"

2. **Add the following variables:**

   ```
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=https://your-domain.vercel.app/api/auth/google
   FRONTEND_URL=https://your-domain.vercel.app
   ```

   **Important:** Replace `your-domain.vercel.app` with your actual Vercel domain.

3. **For Local Development:**
   - Add the same variables with localhost URLs:
   ```
   GOOGLE_CLIENT_ID=your-client-id-here.apps.googleusercontent.com
   GOOGLE_CLIENT_SECRET=your-client-secret-here
   GOOGLE_REDIRECT_URI=http://localhost:3000/api/auth/google
   FRONTEND_URL=http://localhost:3000
   ```

## Step 3: Install Dependencies

The `google-auth-library` package has been added to `package.json`. If deploying to Vercel, it will be installed automatically. For local development:

```bash
npm install
```

## Step 4: Deploy to Vercel

1. **Commit and push your changes:**
   ```bash
   git add .
   git commit -m "Add Google OAuth authentication"
   git push origin main
   ```

2. **Vercel will automatically deploy** with the new environment variables

## Step 5: Test the Integration

1. **Visit your login page**
2. **Click "Continue with Google"**
3. **You should be redirected to Google's login page**
4. **After logging in, you'll be redirected back to your app**

## How It Works

### User Flow:
1. User clicks "Continue with Google"
2. Redirected to Google OAuth consent screen
3. User authorizes the application
4. Google redirects back to `/api/auth/google?code=...`
5. Backend exchanges code for user info
6. User is created/found in MongoDB (synced by email)
7. Auth token is generated (same format as regular login)
8. User is redirected to main app with token

### Database Sync:
- If a user exists with the same email (from regular registration), the Google account is linked
- If no user exists, a new account is created
- Both login methods use the same user record in MongoDB
- Super admin status is preserved for both login methods

### Security:
- OAuth tokens are exchanged server-side
- User passwords are never exposed
- Google ID is stored for future logins
- Same authentication token format for consistency

## Troubleshooting

### "Failed to initialize Google OAuth"
- Check that environment variables are set correctly
- Verify GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET are correct
- Ensure GOOGLE_REDIRECT_URI matches exactly what's in Google Console

### "Redirect URI mismatch"
- Check that the redirect URI in Google Console matches exactly:
  - Production: `https://your-domain.vercel.app/api/auth/google`
  - Development: `http://localhost:3000/api/auth/google`
- No trailing slashes!

### "Invalid client"
- Verify your Client ID is correct
- Check that the OAuth consent screen is published (if required)

### Users not syncing
- Check MongoDB connection
- Verify email addresses match exactly (case-insensitive)
- Check database logs for errors

## Files Modified

- `api/auth/google.js` - Google OAuth API endpoint
- `login.html` - Added Google Sign-In button
- `js/auth/login.js` - Added Google OAuth handler
- `css/auth.css` - Added Google button styles
- `package.json` - Added google-auth-library dependency

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify environment variables are set
3. Test with Google OAuth Playground: https://developers.google.com/oauthplayground/
4. Check Google Cloud Console for API usage and errors

