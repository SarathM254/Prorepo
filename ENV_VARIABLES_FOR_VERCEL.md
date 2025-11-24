# Environment Variables for Vercel

Copy and paste these environment variables into your Vercel project settings:

## Production Environment Variables

Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

Add these variables for **Production**:

```
GOOGLE_CLIENT_ID=88133272458-5sutsbu1jole228ou132r719tjnoirc0.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=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
GOOGLE_REDIRECT_URI=https://proto-social.vercel.app/api/auth/google
FRONTEND_URL=https://proto-social.vercel.app
```

## Important Notes:

1. **Add these in Vercel Dashboard** (not as a file)
2. Make sure to add them for **Production** environment
3. You still need to add your existing variables:
   - `MONGODB_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`

## Google Cloud Console Setup:

Make sure you have added this redirect URI in Google Cloud Console:
- Go to: Google Cloud Console → APIs & Services → Credentials
- Edit your OAuth 2.0 Client ID
- Under "Authorized redirect URIs", add:
  - `https://proto-social.vercel.app/api/auth/google`

## After Adding Variables:

1. Redeploy your Vercel project (or it will auto-deploy on next push)
2. Test Google login at: https://proto-social.vercel.app/login.html

