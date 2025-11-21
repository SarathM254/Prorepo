/**
 * Vercel Serverless Function - Articles
 * Uses Cloudinary for images and MongoDB Atlas for database
 */

import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

// Configure Cloudinary
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
  });
  console.log('✅ [API] Cloudinary configured');
} else {
  console.error('❌ [API] Cloudinary environment variables missing!');
}

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('🔌 [API] Connecting to MongoDB...');
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    console.log('✅ [API] MongoDB connected successfully');
    const db = client.db('campuzway_main');
    console.log('📊 [API] Using database: campuzway_main');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ [API] MongoDB connection error:', error);
    throw error;
  }
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
    console.log('✅ [API] OPTIONS request handled');
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
      
      // Convert MongoDB _id to id for frontend compatibility
      const formattedArticles = articles.map(article => ({
        id: article._id.toString(),
        title: article.title,
        body: article.body,
        tag: article.tag,
        image_path: article.image_path,
        author_name: article.author_name,
        created_at: article.created_at
      }));
      
      console.log('📊 [API] Found', formattedArticles.length, 'articles');
      
      return res.status(200).json({
        success: true,
        articles: formattedArticles
      });
    }

    // POST - Create new article
    if (req.method === 'POST') {
      console.log('📤 [API] POST request - creating article');
      console.log('📦 [API] Request body keys:', Object.keys(req.body || {}));
      
      const { title, body, tag, imageData, author_name } = req.body;
      
      if (!title || !body || !tag) {
        console.error('❌ [API] Missing required fields');
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
          console.log('📏 [API] Image data length:', imageData.length);
          console.log('📏 [API] Image data preview:', imageData.substring(0, 50) + '...');
          
          // Check if Cloudinary is configured
          if (!process.env.CLOUDINARY_CLOUD_NAME) {
            throw new Error('Cloudinary not configured - check environment variables');
          }
          
          // Upload base64 image to Cloudinary (Cloudinary accepts data URLs directly)
          const uploadResult = await cloudinary.uploader.upload(imageData, {
            folder: 'proto-articles',
            resource_type: 'image',
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
          console.log('✅ [API] Image uploaded successfully!');
          console.log('🔗 [API] Image URL:', imageUrl);
          console.log('📦 [API] Image public_id:', uploadResult.public_id);
        } catch (error) {
          console.error('❌ [API] Cloudinary upload error:', error);
          console.error('❌ [API] Error details:', JSON.stringify(error, null, 2));
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + (error.message || 'Unknown error')
          });
        }
      } else {
        // Use default placeholder if no image
        console.log('⚠️ [API] No image data provided, using placeholder');
        imageUrl = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=600&fit=crop';
      }

      // Create article in MongoDB
      const newArticle = {
        title,
        body,
        tag,
        image_path: imageUrl,
        author_name: author_name || 'Anonymous',
        status: 'approved',
        created_at: new Date()
      };

      console.log('💾 [API] Saving article to MongoDB...');
      console.log('📝 [API] Article data:', {
        title: newArticle.title,
        tag: newArticle.tag,
        hasImage: !!newArticle.image_path,
        author: newArticle.author_name
      });

      const result = await articlesCollection.insertOne(newArticle);
      
      if (!result.insertedId) {
        throw new Error('Failed to insert article - no ID returned');
      }
      
      newArticle.id = result.insertedId.toString();
      console.log('✅ [API] Article saved to MongoDB successfully!');
      console.log('🆔 [API] Article ID:', newArticle.id);
      console.log('📊 [API] Insert result:', {
        acknowledged: result.acknowledged,
        insertedId: result.insertedId.toString()
      });

      return res.status(201).json({
        success: true,
        article: {
          id: newArticle.id,
          title: newArticle.title,
          body: newArticle.body,
          tag: newArticle.tag,
          image_path: newArticle.image_path,
          author_name: newArticle.author_name,
          created_at: newArticle.created_at
        },
        message: 'Article created successfully'
      });
    }

    console.error('❌ [API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [API] Fatal Error:', error);
    console.error('❌ [API] Error stack:', error.stack);
    console.error('❌ [API] Error name:', error.name);
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
