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
    return true;
  }
  
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
      cachedClient = null;
      cachedDb = null;
    }
  }

  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    throw new Error('MONGODB_URI environment variable is not set');
  }
  
  const client = new MongoClient(mongoUri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 10000,
    connectTimeoutMS: 10000,
  });

  try {
    await client.connect();
    await client.db('admin').command({ ping: 1 });
    const db = client.db('campuzway_main');

    cachedClient = client;
    cachedDb = db;

    return { client, db };
  } catch (error) {
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
    // Connect to database
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');

    // GET - Fetch all articles
    if (req.method === 'GET') {
      try {
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
        
        return res.status(200).json({
            success: true,
          articles: formattedArticles
        });
      } catch (error) {
        throw error;
      }
    }

    // POST - Create new article
    if (req.method === 'POST') {
      // Parse request body
      let body;
      try {
        body = await parseRequestBody(req);
      } catch (error) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body: ' + error.message
        });
      }
      
      const { title, body: bodyText, tag, imageData, author_name } = body;
      
      // Validate required fields
      if (!title || !bodyText || !tag) {
        return res.status(400).json({
          success: false,
          error: 'Title, body, and tag are required'
        });
      }

      let imageUrl = null;

      // Upload image to Cloudinary if provided
      if (imageData) {
        // Configure Cloudinary
        const cloudinaryConfigured = configureCloudinary();
        if (!cloudinaryConfigured) {
          return res.status(500).json({
            success: false,
            error: 'Cloudinary not configured - check environment variables'
          });
        }

        try {
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
          
          // Upload to Cloudinary
          const uploadResult = await cloudinary.uploader.upload(imageData, uploadOptions);
          
          if (!uploadResult || !uploadResult.secure_url) {
            throw new Error('Cloudinary upload returned invalid response');
          }
          
          imageUrl = uploadResult.secure_url;
        } catch (error) {
          return res.status(500).json({
            success: false,
            error: 'Failed to upload image: ' + (error.message || 'Unknown error'),
            details: error.http_code ? `HTTP ${error.http_code}` : undefined
          });
        }
      } else {
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

      try {
        const result = await articlesCollection.insertOne(newArticle);
        
        if (!result.insertedId) {
          throw new Error('Failed to insert article - no ID returned');
        }
        
        if (!result.acknowledged) {
          throw new Error('Insert operation not acknowledged by MongoDB');
        }
        
        newArticle.id = result.insertedId.toString();

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
        throw error;
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message,
      errorCode: error.code,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}
