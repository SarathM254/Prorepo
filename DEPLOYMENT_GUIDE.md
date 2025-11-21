# Proto - Deployment Guide

## Current Deployment Status

✅ **Deployed on Vercel**  
✅ **MongoDB Atlas Connected**  
✅ **Cloudinary Connected**

## Project Structure (Vercel Deployment)

```
Proto/
├── api/                    # Vercel Serverless Functions
│   ├── health.js          # Health check endpoint
│   ├── login.js           # Authentication
│   ├── register.js        # User registration
│   ├── articles.js        # Articles CRUD with Cloudinary
│   ├── profile.js         # Profile management
│   └── admin/             # Admin APIs
│       └── users.js       # User management
├── js/                     # Frontend JavaScript (MVC architecture)
├── css/                    # Modular stylesheets
├── index.html             # Main application page
├── login.html             # Login/register page
├── admin.html             # Admin panel (super admin only)
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
└── .gitignore             # Git ignore rules
```

## Deployment Platform: Vercel

The website is deployed as a serverless application on Vercel:
- **Frontend**: Static HTML/CSS/JS files served via CDN
- **Backend**: Serverless functions in `/api` folder
- **Auto-deployment**: Automatic deployments on git push

## Cloud Services Configuration

### MongoDB Atlas
- **Database Name**: `campuzway_main`
- **Collections**: `users`, `articles`
- **Connection**: Managed via Vercel environment variables

### Cloudinary
- **Storage**: Images stored in `proto-articles` folder
- **Optimization**: Automatic image compression and format conversion
- **CDN**: Global content delivery network
- **Configuration**: Managed via Vercel environment variables

## Environment Variables

Set these in Vercel Dashboard → Project Settings → Environment Variables:

```
MONGODB_URI=your_mongodb_connection_string
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

**Important**: Never commit environment variables to git. They are managed securely in Vercel dashboard.

## Deployment Workflow

### Initial Deployment
1. Connect GitHub repository to Vercel
2. Vercel auto-detects project structure
3. Set environment variables in Vercel dashboard
4. Deploy automatically on first push

### Ongoing Deployments
1. Make code changes locally
2. Commit changes to git
3. Push to GitHub
4. Vercel automatically triggers deployment
5. Preview URL generated for each commit
6. Production deployment on merge to main branch

## Prerequisites

1. **GitHub Account** - [Sign up](https://github.com/join)
2. **Vercel Account** - [Sign up](https://vercel.com/signup)
3. **Git** - [Install Git](https://git-scm.com/downloads)
4. **MongoDB Atlas Account** - [Sign up](https://www.mongodb.com/cloud/atlas/register)
5. **Cloudinary Account** - [Sign up](https://cloudinary.com/users/register)

## Deployment Steps

### Step 1: Connect Repository to Vercel

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect project settings

### Step 2: Configure Environment Variables

1. In Vercel project settings, go to "Environment Variables"
2. Add all required variables:
   - `MONGODB_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
3. Apply to all environments (Production, Preview, Development)

### Step 3: Deploy

1. Click "Deploy" in Vercel dashboard
2. Wait for build process to complete
3. Access your live URL

## What Happens During Deployment

- ✅ Serverless functions in `/api` are automatically detected
- ✅ Static files (HTML, CSS, JS) served from root
- ✅ Automatic HTTPS certificate generation
- ✅ Global CDN distribution for fast loading
- ✅ Environment variables injected into serverless functions
- ✅ Automatic builds on every git push

## Updating Deployment

After making code changes:

```bash
git add .
git commit -m "Your update message"
git push
```

Vercel automatically:
- Detects the push to GitHub
- Triggers new build
- Runs deployment
- Updates production site (if on main branch)
- Creates preview deployment (for other branches)

## Live URLs

After deployment, you'll receive:
- **Production URL**: `https://your-project-name.vercel.app`
- **Preview URLs**: Generated for each branch/PR
- **Custom Domain**: Can be added in Vercel project settings

## Current Production Configuration

✅ **Database**: MongoDB Atlas (persistent storage)  
✅ **Image Storage**: Cloudinary (persistent CDN)  
✅ **Authentication**: Token-based with MongoDB  
✅ **Auto-deployment**: Enabled on git push  
✅ **HTTPS**: Automatic SSL certificates

## Local Development

To test locally before deploying:

```bash
# Install dependencies
npm install

# Install Vercel CLI (if not already installed)
npm install -g vercel

# Run local development server
vercel dev

# Open http://localhost:3000
```

The local server will:
- Use environment variables from `.env.local` file
- Simulate serverless functions locally
- Match production behavior

## Troubleshooting

### API calls failing
- Check browser console for errors
- Verify `/api` paths are correct
- Ensure environment variables are set in Vercel

### CORS errors
- CORS is configured in serverless functions
- Check `vercel.json` if modified

### Functions not deploying
- Ensure `api/` folder structure is correct
- Check function export syntax (default export)
- Review build logs in Vercel dashboard

### Database connection issues
- Verify `MONGODB_URI` is set correctly
- Check MongoDB Atlas IP whitelist (should include Vercel IPs)
- Verify database name matches (`campuzway_main`)

### Image upload issues
- Verify Cloudinary environment variables are set
- Check Cloudinary dashboard for upload logs
- Ensure image data is sent as base64 string

## Monitoring & Logs

- **Build Logs**: Available in Vercel dashboard for each deployment
- **Function Logs**: View real-time logs in Vercel dashboard
- **Analytics**: Vercel provides built-in analytics for performance monitoring

## Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Serverless Functions Guide](https://vercel.com/docs/functions/serverless-functions)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Cloudinary Documentation](https://cloudinary.com/documentation)

---

**Status**: ✅ Deployed and Running  
**Platform**: Vercel  
**Database**: MongoDB Atlas  
**Storage**: Cloudinary  
**Last Updated**: Deployment configuration documentation
