# 🛠️ Implementation Example: Cloudinary + MongoDB Atlas

This document shows exactly how to update your code to use cloud storage and database.

## 📦 Step 1: Install Dependencies

Update your `package.json` in the root directory:

```json
{
  "dependencies": {
    "cloudinary": "^1.41.0",
    "mongodb": "^6.3.0"
  }
}
```

Then run: `npm install`

---

## 🔧 Step 2: Updated `api/articles.js`

Here's the complete updated version:

```javascript
/**
 * Vercel Serverless Function - Articles
 * Uses Cloudinary for images and MongoDB Atlas for database
 */

import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  await client.connect();
  const db = client.db('proto');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  console.log('=== 📡 [API] Articles endpoint called ===');
  console.log('🔧 [API] Method:', req.method);
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');

    // GET - Fetch all articles
    if (req.method === 'GET') {
      console.log('📥 [API] GET request - fetching articles from MongoDB');
      
      const articles = await articlesCollection
        .find({ status: 'approved' })
        .sort({ created_at: -1 })
        .toArray();
      
      console.log('📊 [API] Found', articles.length, 'articles');
      
      return res.status(200).json({
        success: true,
        articles: articles
      });
    }

    // POST - Create new article
    if (req.method === 'POST') {
      console.log('📤 [API] POST request - creating article');
      
      const { title, body, tag, imageData, author_name } = req.body;
      
      if (!title || !body || !tag) {
        return res.status(400).json({
          success: false,
          error: 'Title, body, and tag are required'
        });
      }

      let imageUrl = null;

      // Upload image to Cloudinary if provided
      if (imageData) {
        try {
          console.log('☁️ [API] Uploading image to Cloudinary...');
          
          // If imageData is base64, upload it
          const uploadResult = await cloudinary.uploader.upload(imageData, {
            folder: 'proto-articles',
            transformation: [
              {
                width: 1500,
                height: 1100,
                crop: 'fill',
                quality: 'auto',
                format: 'auto'
              }
            ]
          });
          
          imageUrl = uploadResult.secure_url;
          console.log('✅ [API] Image uploaded:', imageUrl);
        } catch (error) {
          console.error('❌ [API] Cloudinary upload error:', error);
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image'
          });
        }
      }

      // Create article in MongoDB
      const newArticle = {
        title,
        body,
        tag,
        image_path: imageUrl || 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=600&fit=crop',
        author_name: author_name || 'Anonymous',
        status: 'approved',
        created_at: new Date()
      };

      const result = await articlesCollection.insertOne(newArticle);
      newArticle.id = result.insertedId.toString();
      
      console.log('✅ [API] Article created in MongoDB:', newArticle.id);

      return res.status(201).json({
        success: true,
        article: newArticle,
        message: 'Article created successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [API] Error:', error);
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
```

---

## 🔧 Step 3: Update Frontend Image Upload

Update `js/views/FormView.js` to send base64 image data:

The `getAdjustedImageBlob()` function already exists. Update the form submission in `js/controllers/AppController.js`:

```javascript
// In AppController.js - update submitArticle handler
async handleArticleSubmit(e) {
    e.preventDefault();
    
    const title = FormView.elements.titleInput.value.trim();
    const body = FormView.elements.bodyInput.value.trim();
    const tag = FormView.elements.articleTag.value;
    
    if (!title || !body || !tag) {
        alert('Please fill in all required fields');
        return;
    }
    
    FormView.setSubmitting(true);
    
    try {
        // Get adjusted image as base64
        let imageData = null;
        if (FormView.currentImageFile) {
            const blob = await FormView.getAdjustedImageBlob();
            if (blob) {
                // Convert blob to base64
                imageData = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result);
                    reader.readAsDataURL(blob);
                });
            }
        }
        
        const articleData = {
            title,
            body,
            tag,
            imageData,
            author_name: 'Current User' // Get from auth
        };
        
        const article = await ArticleModel.submitArticle(articleData);
        console.log('Article submitted:', article);
        
        // Refresh articles
        await this.loadArticles();
        
        // Close form
        FormView.closeArticleFormModal();
        
        alert('Article submitted successfully!');
    } catch (error) {
        console.error('Error submitting article:', error);
        alert('Failed to submit article: ' + error.message);
    } finally {
        FormView.setSubmitting(false);
    }
}
```

---

## 🔧 Step 4: Update Authentication API

Update `api/login.js` and `api/register.js` to use MongoDB:

```javascript
// api/login.js
import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  const client = new MongoClient(process.env.MONGODB_URI);
  await client.connect();
  const db = client.db('proto');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required' });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    const user = await usersCollection.findOne({ email });

    if (!user) {
      return res.status(404).json({ error: 'This email address is not registered.' });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid password.' });
    }

    // Create session (you can use JWT or session storage)
    return res.status(200).json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

## 🔧 Step 5: Initialize MongoDB Database

Create a setup script to initialize collections:

```javascript
// scripts/init-db.js
import { MongoClient } from 'mongodb';

const client = new MongoClient(process.env.MONGODB_URI);

async function initDatabase() {
  try {
    await client.connect();
    const db = client.db('proto');

    // Create collections
    await db.createCollection('users');
    await db.createCollection('articles');
    await db.createCollection('sessions');

    // Create indexes
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    await db.collection('articles').createIndex({ created_at: -1 });
    await db.collection('articles').createIndex({ status: 1 });

    console.log('✅ Database initialized successfully');
  } catch (error) {
    console.error('❌ Database initialization error:', error);
  } finally {
    await client.close();
  }
}

initDatabase();
```

---

## 🔐 Step 6: Environment Variables

Add these to Vercel Dashboard → Project Settings → Environment Variables:

```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/proto?retryWrites=true&w=majority
```

---

## 📊 Database Schema

### Users Collection
```javascript
{
  _id: ObjectId,
  name: String,
  email: String (unique),
  password: String (hashed),
  created_at: Date
}
```

### Articles Collection
```javascript
{
  _id: ObjectId,
  title: String,
  body: String,
  tag: String,
  image_path: String (Cloudinary URL),
  author_name: String,
  status: String ('pending' | 'approved'),
  created_at: Date
}
```

---

## 🚀 Testing Locally

1. Create `.env.local` file:
```
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
MONGODB_URI=mongodb+srv://...
```

2. Run: `vercel dev`

3. Test article creation with image upload

---

## ✅ Migration Checklist

- [ ] Sign up for Cloudinary account
- [ ] Sign up for MongoDB Atlas account
- [ ] Create MongoDB cluster and database
- [ ] Add environment variables to Vercel
- [ ] Install dependencies (`npm install`)
- [ ] Update `api/articles.js`
- [ ] Update `api/login.js` and `api/register.js`
- [ ] Update frontend form submission
- [ ] Test image upload
- [ ] Test article creation
- [ ] Deploy to Vercel
- [ ] Verify production deployment

---

## 🎯 Benefits After Migration

1. ✅ **No Storage Limits**: Images stored in Cloudinary (25GB free)
2. ✅ **Fast Loading**: CDN delivery for images
3. ✅ **Scalable Database**: MongoDB handles 20k+ articles easily
4. ✅ **Persistent Data**: No data loss on deployments
5. ✅ **Image Optimization**: Automatic compression and format conversion
6. ✅ **Cost Effective**: Free tiers cover most use cases

---

**Next**: Follow the steps above to migrate your app to cloud storage and database!


