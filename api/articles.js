/**
 * Vercel Serverless Function - Articles
 * Uses Cloudinary for images and MongoDB Atlas for database
 */

import { v2 as cloudinary } from 'cloudinary';
import { MongoClient } from 'mongodb';

// Function to configure Cloudinary
function configureCloudinary() {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  
  if (cloudName && apiKey && apiSecret) {
    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret
    });
    console.log('✅ [API] Cloudinary configured with cloud_name:', cloudName);
    return true;
  }
  
  console.error('❌ [API] Cloudinary configuration missing!');
  console.error('❌ [API] CLOUDINARY_CLOUD_NAME:', cloudName || 'MISSING');
  console.error('❌ [API] CLOUDINARY_API_KEY:', apiKey ? 'SET' : 'MISSING');
  console.error('❌ [API] CLOUDINARY_API_SECRET:', apiSecret ? 'SET' : 'MISSING');
  return false;
}

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      // Test if connection is still alive
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      console.log('⚠️ [API] Cached connection dead, reconnecting...');
      cachedClient = null;
      cachedDb = null;
    }
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  console.log('🔌 [API] Connecting to MongoDB...');
  console.log('🔗 [API] MongoDB URI (masked):', mongoUri.replace(/\/\/.*@/, '//***:***@'));
  
  const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
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
    
    // List collections to verify database access
    try {
      const collections = await db.listCollections().toArray();
      console.log('📋 [API] Existing collections:', collections.map(c => c.name).join(', ') || 'none');
    } catch (err) {
      console.log('📋 [API] Could not list collections (database might be new):', err.message);
    }

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
    console.error('❌ [API] MongoDB connection error:', error);
    console.error('❌ [API] Error name:', error.name);
    console.error('❌ [API] Error message:', error.message);
    if (error.code) {
      console.error('❌ [API] Error code:', error.code);
    }
    throw error;
  }
}

// Helper to parse request body (handles both parsed and unparsed)
async function parseRequestBody(req) {
  // If body is already an object, return it
  if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  
  // If body is a string, try to parse it
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      console.error('❌ [API] Failed to parse request body as JSON:', error);
      throw new Error('Invalid JSON in request body');
    }
  }
  
  // If body is undefined or null, return empty object
  if (!req.body) {
    return {};
  }
  
  // For other cases, return as is
  return req.body;
}

export default async function handler(req, res) {
  const startTime = Date.now();
    console.log('=== 📡 [API] Articles endpoint called ===');
    console.log('🔧 [API] Method:', req.method);
    console.log('🌐 [API] URL:', req.url);
  console.log('📦 [API] Content-Type:', req.headers['content-type']);
    
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
    // Connect to database
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
        
        const duration = Date.now() - startTime;
        console.log(`✅ [API] GET request completed in ${duration}ms`);
        
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
      
      // Parse request body
      let body;
      try {
        body = await parseRequestBody(req);
        console.log('✅ [API] Request body parsed successfully');
        console.log('📦 [API] Request body keys:', Object.keys(body || {}));
      } catch (error) {
        console.error('❌ [API] Failed to parse request body:', error);
        return res.status(400).json({
          success: false,
          error: 'Invalid request body: ' + error.message
        });
      }
      
      const { title, body: bodyText, tag, imageData, author_name } = body;
      
      // Validate required fields
      if (!title || !bodyText || !tag) {
                console.error('❌ [API] Missing required fields');
        console.error('❌ [API] Title:', !!title, title ? `"${title.substring(0, 30)}"` : 'missing');
        console.error('❌ [API] Body:', !!bodyText, bodyText ? `${bodyText.length} chars` : 'missing');
        console.error('❌ [API] Tag:', !!tag, tag || 'missing');
                return res.status(400).json({
                    success: false,
                    error: 'Title, body, and tag are required'
                });
            }

      console.log('✅ [API] All required fields present');
      console.log('📝 [API] Title:', title.substring(0, 50));
      console.log('📝 [API] Tag:', tag);
      console.log('📝 [API] Body length:', bodyText.length, 'characters');
      console.log('🖼️ [API] Has imageData:', !!imageData);
      console.log('🖼️ [API] ImageData type:', typeof imageData);
      if (imageData) {
        console.log('🖼️ [API] ImageData length:', imageData.length, 'characters');
        console.log('🖼️ [API] ImageData starts with:', imageData.substring(0, 50));
        console.log('🖼️ [API] Is base64 data URL:', imageData.startsWith('data:image'));
      }

      let imageUrl = null;

      // Upload image to Cloudinary if provided
      if (imageData) {
        console.log('☁️ [API] Starting Cloudinary upload process...');
        
        // Configure Cloudinary
        const cloudinaryConfigured = configureCloudinary();
        if (!cloudinaryConfigured) {
          return res.status(500).json({
            success: false,
            error: 'Cloudinary not configured - check environment variables'
          });
        }

        try {
          console.log('☁️ [API] Uploading image to Cloudinary...');
          
          // Cloudinary upload options
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
          
          console.log('☁️ [API] Upload options:', JSON.stringify(uploadOptions));
          console.log('☁️ [API] Starting Cloudinary upload...');
          
          // Upload to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(imageData, uploadOptions);
          
          console.log('☁️ [API] Cloudinary upload response received');
          console.log('☁️ [API] Upload result keys:', Object.keys(uploadResult || {}));
          
          if (!uploadResult || !uploadResult.secure_url) {
            console.error('❌ [API] Invalid Cloudinary response:', uploadResult);
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
          if (error.http_code) {
            console.error('❌ [API] Cloudinary HTTP code:', error.http_code);
          }
          if (error.message) {
            console.error('❌ [API] Cloudinary error message:', error.message);
          }
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + (error.message || 'Unknown error'),
            details: error.http_code ? `HTTP ${error.http_code}` : undefined
          });
        }
      } else {
        console.log('⚠️ [API] No image data provided, using placeholder');
        imageUrl = 'https://images.unsplash.com/photo-1541339907198-e08756dedf3f?w=800&h=600&fit=crop';
      }

      // Create article in MongoDB
            const newArticle = {
        title: title.trim(),
        body: bodyText.trim(),
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

        // Verify the article was saved
        const savedArticle = await articlesCollection.findOne({ _id: result.insertedId });
        if (savedArticle) {
          console.log('✅ [API] Verified article exists in database');
          console.log('✅ [API] Article title in DB:', savedArticle.title);
        } else {
          console.warn('⚠️ [API] Article inserted but not found on verification');
        }

        const duration = Date.now() - startTime;
        console.log(`✅ [API] POST request completed in ${duration}ms`);

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
        if (error.code) {
          console.error('❌ [API] Error code:', error.code);
        }
        throw error;
        }
    }

    console.error('❌ [API] Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('❌ [API] Fatal Error after', duration + 'ms:', error);
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
