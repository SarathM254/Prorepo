/**
 * Vercel Serverless Function - Articles
 * Uses Cloudinary for images and MongoDB Atlas for database
 */

import { v2 as cloudinary } from 'cloudinary';
import { MongoClient, ObjectId } from 'mongodb';

// Function to configure Cloudinary (call this in handler to ensure env vars are available)
function configureCloudinary() {
  if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET
    });
    return true;
  }
  return false;
}

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    console.log('♻️ [API] Reusing cached MongoDB connection');
    return { client: cachedClient, db: cachedDb };
  }

  if (!process.env.MONGODB_URI) {
    const error = new Error('MONGODB_URI environment variable is not set');
    console.error('❌ [API]', error.message);
    throw error;
  }

  console.log('🔌 [API] Connecting to MongoDB...');
  console.log('🔗 [API] MongoDB URI (masked):', process.env.MONGODB_URI.replace(/\/\/.*@/, '//***:***@'));
  
  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    console.log('✅ [API] MongoDB connected successfully');
    
    // Test the connection
    await client.db('admin').command({ ping: 1 });
    console.log('✅ [API] MongoDB ping successful');
    
    const db = client.db('campuzway_main');
    console.log('📊 [API] Using database: campuzway_main');
    
    // Verify we can access the database by listing collections
    const collections = await db.listCollections().toArray();
    console.log('📋 [API] Existing collections:', collections.map(c => c.name));

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ [API] MongoDB connection error:', error);
    console.error('❌ [API] Error name:', error.name);
    console.error('❌ [API] Error message:', error.message);
    if (cachedClient) {
      cachedClient = null;
      cachedDb = null;
    }
    throw error;
  }
}

export default async function handler(req, res) {
  console.log('=== 📡 [API] Articles endpoint called ===');
  console.log('🔧 [API] Method:', req.method);
  console.log('🌐 [API] URL:', req.url);
  
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
    // Connect to database first
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');
    console.log('📚 [API] Articles collection ready');

    // GET - Fetch all articles
    if (req.method === 'GET') {
      console.log('📥 [API] GET request - fetching articles from MongoDB');
      
      try {
        const articles = await articlesCollection
          .find({ status: 'approved' })
          .sort({ created_at: -1 })
          .toArray();
        
        console.log('📊 [API] Found', articles.length, 'articles in database');
        
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
        
        return res.status(200).json({
          success: true,
          articles: formattedArticles
        });
      } catch (error) {
        console.error('❌ [API] Error fetching articles:', error);
        throw error;
      }
    }

    // POST - Create new article
    if (req.method === 'POST') {
      console.log('📤 [API] POST request - creating article');
      console.log('📦 [API] Request body type:', typeof req.body);
      console.log('📦 [API] Request body keys:', Object.keys(req.body || {}));
      
      const { title, body, tag, imageData, author_name } = req.body;
      
      // Validate required fields
      if (!title || !body || !tag) {
        console.error('❌ [API] Missing required fields');
        console.error('❌ [API] Title:', !!title);
        console.error('❌ [API] Body:', !!body);
        console.error('❌ [API] Tag:', !!tag);
        return res.status(400).json({
          success: false,
          error: 'Title, body, and tag are required'
        });
      }

      console.log('✅ [API] All required fields present');
      console.log('📝 [API] Title:', title.substring(0, 50));
      console.log('📝 [API] Tag:', tag);
      console.log('🖼️ [API] Has imageData:', !!imageData);
      console.log('🖼️ [API] ImageData type:', typeof imageData);
      if (imageData) {
        console.log('🖼️ [API] ImageData length:', imageData.length);
        console.log('🖼️ [API] ImageData preview:', imageData.substring(0, 100) + '...');
      }

      let imageUrl = null;

      // Upload image to Cloudinary if provided
      if (imageData) {
        console.log('☁️ [API] Starting Cloudinary upload process...');
        
        // Configure Cloudinary (ensure env vars are available)
        const cloudinaryConfigured = configureCloudinary();
        if (!cloudinaryConfigured) {
          console.error('❌ [API] Cloudinary not configured!');
          console.error('❌ [API] CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME || 'MISSING');
          console.error('❌ [API] CLOUDINARY_API_KEY:', !!process.env.CLOUDINARY_API_KEY);
          console.error('❌ [API] CLOUDINARY_API_SECRET:', !!process.env.CLOUDINARY_API_SECRET);
          return res.status(500).json({
            success: false,
            error: 'Cloudinary not configured - check environment variables'
          });
        }
        
        console.log('✅ [API] Cloudinary configured successfully');

        try {
          console.log('☁️ [API] Uploading image to Cloudinary...');
          
          // Cloudinary accepts data URLs directly (data:image/...;base64,...)
          // But we need to ensure it's in the right format
          const uploadOptions = {
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
          };
          
          console.log('☁️ [API] Upload options:', JSON.stringify(uploadOptions, null, 2));
          
          const uploadResult = await cloudinary.uploader.upload(imageData, uploadOptions);
          
          if (!uploadResult || !uploadResult.secure_url) {
            throw new Error('Cloudinary upload returned invalid response');
          }
          
          imageUrl = uploadResult.secure_url;
          console.log('✅ [API] Image uploaded successfully!');
          console.log('🔗 [API] Image URL:', imageUrl);
          console.log('📦 [API] Image public_id:', uploadResult.public_id);
          console.log('📊 [API] Image format:', uploadResult.format);
          console.log('📏 [API] Image size:', uploadResult.bytes, 'bytes');
        } catch (error) {
          console.error('❌ [API] Cloudinary upload error:', error);
          console.error('❌ [API] Error name:', error.name);
          console.error('❌ [API] Error message:', error.message);
          console.error('❌ [API] Error stack:', error.stack);
          if (error.http_code) {
            console.error('❌ [API] Cloudinary HTTP code:', error.http_code);
          }
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + (error.message || 'Unknown error'),
            details: error.http_code ? `HTTP ${error.http_code}` : undefined
          });
        }
      } else {
        // Use default placeholder if no image
        console.log('⚠️ [API] No image data provided, using placeholder');
        imageUrl = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=600&fit=crop';
      }

      // Create article in MongoDB
      const newArticle = {
        title: title.trim(),
        body: body.trim(),
        tag: tag.trim(),
        image_path: imageUrl,
        author_name: (author_name || 'Anonymous').trim(),
        status: 'approved',
        created_at: new Date()
      };

      console.log('💾 [API] Saving article to MongoDB...');
      console.log('📝 [API] Article data:', {
        title: newArticle.title.substring(0, 50),
        tag: newArticle.tag,
        hasImage: !!newArticle.image_path,
        imageUrl: newArticle.image_path ? newArticle.image_path.substring(0, 100) + '...' : 'none',
        author: newArticle.author_name
      });

      try {
        const result = await articlesCollection.insertOne(newArticle);
        
        if (!result.insertedId) {
          throw new Error('Failed to insert article - no ID returned');
        }
        
        if (!result.acknowledged) {
          throw new Error('Insert operation not acknowledged by MongoDB');
        }
        
        newArticle.id = result.insertedId.toString();
        console.log('✅ [API] Article saved to MongoDB successfully!');
        console.log('🆔 [API] Article ID:', newArticle.id);
        console.log('📊 [API] Insert result:', {
          acknowledged: result.acknowledged,
          insertedId: result.insertedId.toString()
        });

        // Verify the article was saved by fetching it back
        const savedArticle = await articlesCollection.findOne({ _id: result.insertedId });
        if (savedArticle) {
          console.log('✅ [API] Verified article exists in database');
        } else {
          console.warn('⚠️ [API] Article inserted but not found on verification');
        }

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
      } catch (error) {
        console.error('❌ [API] MongoDB insert error:', error);
        console.error('❌ [API] Error name:', error.name);
        console.error('❌ [API] Error message:', error.message);
        console.error('❌ [API] Error code:', error.code);
        throw error;
      }
    }

    console.error('❌ [API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('❌ [API] Fatal Error:', error);
    console.error('❌ [API] Error name:', error.name);
    console.error('❌ [API] Error message:', error.message);
    console.error('❌ [API] Error stack:', error.stack);
    if (error.code) {
      console.error('❌ [API] Error code:', error.code);
    }
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
