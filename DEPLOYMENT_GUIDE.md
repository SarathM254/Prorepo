# 🚀 Proto - Vercel Deployment Guide

## ✅ Project Structure (Vercel-Ready)

```
Proto/
├── api/                    # Serverless Functions
│   ├── health.js          # Health check endpoint
│   ├── login.js           # Login authentication
│   ├── articles.js        # Articles CRUD
│   └── auth/
│       └── status.js      # Auth status check
├── js/                     # Frontend JavaScript
├── css/                    # Stylesheets
├── uploads/               # Static images
├── Tests/                 # Test files
├── index.html             # Main HTML
├── login.html             # Login page
├── vercel.json            # Vercel configuration
├── package.json           # Dependencies
├── .gitignore             # Git ignore rules
└── README.md              # Project documentation
```

## 📋 Prerequisites

1. **GitHub Account** - [Sign up](https://github.com/join)
2. **Vercel Account** - [Sign up](https://vercel.com/signup)
3. **Git** - [Install Git](https://git-scm.com/downloads)

## 🔧 Step 1: Initialize Git Repository

```bash
# Initialize Git (if not already done)
git init

# Add all files
git add .

# Commit
git commit -m "Initial commit - Vercel ready structure"
```

## 🌐 Step 2: Push to GitHub

### Option A: Using GitHub CLI (Recommended)
```bash
# Install GitHub CLI: https://cli.github.com/

# Authenticate
gh auth login

# Create repository and push
gh repo create proto-campus-news --public --source=. --remote=origin --push
```

### Option B: Manual GitHub Setup
1. Go to [GitHub](https://github.com/new)
2. Create new repository named `proto-campus-news`
3. Run these commands:
```bash
git remote add origin https://github.com/YOUR_USERNAME/proto-campus-news.git
git branch -M main
git push -u origin main
```

## ☁️ Step 3: Deploy to Vercel

### Option A: Using Vercel CLI (Fastest)
```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Deploy (it will ask a few questions)
vercel --prod
```

### Option B: Using Vercel Dashboard (Easiest)
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect settings
5. Click "Deploy"

## 🎯 What Happens on Vercel?

- ✅ Serverless functions created in `/api`
- ✅ Static files served from root
- ✅ Automatic HTTPS
- ✅ Global CDN distribution
- ✅ Automatic deployments on git push

## ⚙️ Environment Variables (Optional)

If you add a database later, set environment variables in Vercel:
1. Go to Project Settings → Environment Variables
2. Add variables like:
   - `MONGODB_URI` - MongoDB connection string
   - `JWT_SECRET` - For authentication
   - etc.

## 🔄 Update and Redeploy

After making changes:
```bash
git add .
git commit -m "Your update message"
git push

# Vercel automatically redeploys!
```

Or manually:
```bash
vercel --prod
```

## 📱 Your Live URLs

After deployment, you'll get:
- **Production**: `https://proto-campus-news.vercel.app`
- **Custom Domain**: Can add in Vercel settings

## ⚠️ Important Notes

### Current Limitations (Demo Mode):
- ✅ Articles are stored in-memory (resets on redeploy)
- ✅ File uploads not persisted
- ✅ Authentication is demo mode

### For Production (Add Later):
- 📊 **Database**: Connect MongoDB Atlas (free tier)
- 🔐 **Auth**: Add JWT tokens
- 📁 **Storage**: Use Vercel Blob or Cloudinary for images

## 🛠️ Local Development

To test locally:
```bash
# Install dependencies
npm install

# Run Vercel development server
npm run dev

# Open http://localhost:3000
```

## 🆘 Troubleshooting

### Issue: API calls failing
**Solution**: Check browser console, ensure `/api` paths are correct

### Issue: CORS errors
**Solution**: Already configured in `vercel.json`, but check if you modified it

### Issue: Functions not deploying
**Solution**: Ensure `api/` folder structure is correct

## 📚 Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Serverless Functions Guide](https://vercel.com/docs/functions/serverless-functions)
- [GitHub Actions for CI/CD](https://docs.github.com/en/actions)

## ✨ Next Steps

1. ✅ Deploy to Vercel
2. 📊 Add MongoDB for persistence
3. 🔐 Add real authentication (JWT)
4. 📁 Add Vercel Blob for file uploads
5. 🎨 Customize domain name

---

**Status**: Ready for deployment! 🚀
**Support**: Check Vercel docs or community forums

