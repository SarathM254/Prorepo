/**
 * Vercel Serverless Function - Admin Articles Management
 * Super Admin only endpoints for article management
 */

import { MongoClient, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  if (cachedClient && cachedDb) {
    try {
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      cachedClient = null;
      cachedDb = null;
    }
  }

  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  });

  try {
    await client.connect();
    const db = client.db('campuzway_main');
    cachedClient = client;
    cachedDb = db;
    return { client, db };
  } catch (error) {
    throw error;
  }
}

// Configure Cloudinary
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

// Middleware to check if user is super admin
async function requireSuperAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const token = authHeader.substring(7);
  const [email] = token.split(':');
  
  if (!email) {
    return { authorized: false, error: 'Invalid token' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decodeURIComponent(email).toLowerCase() 
    });
    
    if (!user || !user.isSuperAdmin) {
      return { authorized: false, error: 'Super admin access required' };
    }
    
    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, error: 'Database error' };
  }
}

// Helper to parse request body
async function parseRequestBody(req) {
  if (typeof req.body === 'object' && req.body !== null && !Buffer.isBuffer(req.body)) {
    return req.body;
  }
  
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body);
    } catch (error) {
      throw new Error('Invalid JSON in request body');
    }
  }
  
  return req.body || {};
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check super admin access
  const authCheck = await requireSuperAdmin(req);
  if (!authCheck.authorized) {
    return res.status(authCheck.error === 'Super admin access required' ? 403 : 401).json({
      success: false,
      error: authCheck.error
    });
  }

  try {
    const { db } = await connectToDatabase();
    const articlesCollection = db.collection('articles');

    // GET - List all articles (with pagination/filtering)
    if (req.method === 'GET') {
      const articleId = req.query.articleId;
      
      // GET single article by ID
      if (articleId) {
        try {
          const article = await articlesCollection.findOne({ 
            _id: new ObjectId(articleId) 
          });
          
          if (!article) {
            return res.status(404).json({
              success: false,
              error: 'Article not found'
            });
          }
          
          // Get author info
          const usersCollection = db.collection('users');
          const author = await usersCollection.findOne({ _id: article.user_id ? new ObjectId(article.user_id) : null });
          
          return res.status(200).json({
            success: true,
            article: {
              id: article._id.toString(),
              title: article.title,
              body: article.body,
              tag: article.tag,
              image_path: article.image_path,
              author_name: article.author_name || author?.name || 'Unknown',
              author_id: article.user_id?.toString() || author?._id?.toString() || null,
              status: article.status || 'pending',
              created_at: article.created_at
            }
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid article ID'
          });
        }
      }
      
      // GET all articles with pagination/filtering
      const page = parseInt(req.query.page) || 1;
      const limit = parseInt(req.query.limit) || 20;
      const search = req.query.search || '';
      const tag = req.query.tag || '';
      const status = req.query.status || '';
      
      // Build query
      const query = {};
      
      if (search) {
        query.$or = [
          { title: { $regex: search, $options: 'i' } },
          { body: { $regex: search, $options: 'i' } }
        ];
      }
      
      if (tag) {
        query.tag = tag;
      }
      
      if (status) {
        query.status = status;
      }
      
      // Get total count
      const total = await articlesCollection.countDocuments(query);
      
      // Get articles with pagination
      const articles = await articlesCollection
        .find(query)
        .sort({ created_at: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .toArray();
      
      // Get author names for articles
      const usersCollection = db.collection('users');
      const userIds = [...new Set(articles.map(a => a.user_id).filter(Boolean))];
      const users = await usersCollection.find({ 
        _id: { $in: userIds.map(id => new ObjectId(id)) } 
      }).toArray();
      const userMap = {};
      users.forEach(u => {
        userMap[u._id.toString()] = u.name;
      });
      
      const formattedArticles = articles.map(article => ({
        id: article._id.toString(),
        title: article.title,
        body: article.body,
        tag: article.tag,
        image_path: article.image_path,
        author_name: article.author_name || userMap[article.user_id?.toString()] || 'Unknown',
        author_id: article.user_id?.toString() || null,
        status: article.status || 'pending',
        created_at: article.created_at
      }));
      
      return res.status(200).json({
        success: true,
        articles: formattedArticles,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      });
    }

    // PUT - Update article
    if (req.method === 'PUT') {
      const articleId = req.query.articleId;
      
      if (!articleId) {
        return res.status(400).json({
          success: false,
          error: 'Article ID is required'
        });
      }
      
      try {
        const body = await parseRequestBody(req);
        const { title, body: bodyText, tag, status, imageData } = body;
        
        // Check if article exists
        const existingArticle = await articlesCollection.findOne({ 
          _id: new ObjectId(articleId) 
        });
        
        if (!existingArticle) {
          return res.status(404).json({
            success: false,
            error: 'Article not found'
          });
        }
        
        // Build update object
        const updateData = {};
        
        if (title !== undefined) {
          updateData.title = title.trim();
        }
        
        if (bodyText !== undefined) {
          updateData.body = bodyText.trim();
        }
        
        if (tag !== undefined) {
          updateData.tag = tag.trim();
        }
        
        if (status !== undefined) {
          updateData.status = status;
        }
        
        // Handle image update
        if (imageData) {
          const cloudinaryConfigured = configureCloudinary();
          if (!cloudinaryConfigured) {
            return res.status(500).json({
              success: false,
              error: 'Cloudinary not configured'
            });
          }
          
          try {
            // Delete old image from Cloudinary if it exists
            if (existingArticle.image_path && existingArticle.image_path.includes('cloudinary.com')) {
              try {
                const publicId = existingArticle.image_path.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
              } catch (deleteError) {
                // Continue even if deletion fails
              }
            }
            
            // Upload new image
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
            
            updateData.image_path = uploadResult.secure_url;
          } catch (uploadError) {
            return res.status(500).json({
              success: false,
              error: 'Failed to upload image: ' + uploadError.message
            });
          }
        }
        
        // Update article
        const result = await articlesCollection.updateOne(
          { _id: new ObjectId(articleId) },
          { $set: updateData }
        );
        
        if (result.matchedCount === 0) {
          return res.status(404).json({
            success: false,
            error: 'Article not found'
          });
        }
        
        // Get updated article
        const updatedArticle = await articlesCollection.findOne({ 
          _id: new ObjectId(articleId) 
        });
        
        // Get author info
        const usersCollection = db.collection('users');
        const author = await usersCollection.findOne({ 
          _id: updatedArticle.user_id ? new ObjectId(updatedArticle.user_id) : null 
        });
        
        return res.status(200).json({
          success: true,
          article: {
            id: updatedArticle._id.toString(),
            title: updatedArticle.title,
            body: updatedArticle.body,
            tag: updatedArticle.tag,
            image_path: updatedArticle.image_path,
            author_name: updatedArticle.author_name || author?.name || 'Unknown',
            author_id: updatedArticle.user_id?.toString() || null,
            status: updatedArticle.status || 'pending',
            created_at: updatedArticle.created_at
          },
          message: 'Article updated successfully'
        });
      } catch (error) {
        if (error.message.includes('Invalid article ID') || error.message.includes('ObjectId')) {
          return res.status(400).json({
            success: false,
            error: 'Invalid article ID'
          });
        }
        throw error;
      }
    }

    // DELETE - Delete article(s)
    if (req.method === 'DELETE') {
      const articleId = req.query.articleId;
      const articleIds = req.query.articleIds; // For bulk delete
      
      // Bulk delete
      if (articleIds) {
        try {
          const ids = articleIds.split(',').map(id => new ObjectId(id.trim()));
          
          // Get articles to delete (to get image URLs)
          const articlesToDelete = await articlesCollection.find({ 
            _id: { $in: ids } 
          }).toArray();
          
          // Delete images from Cloudinary
          const cloudinaryConfigured = configureCloudinary();
          if (cloudinaryConfigured) {
            for (const article of articlesToDelete) {
              if (article.image_path && article.image_path.includes('cloudinary.com')) {
              try {
                const publicId = article.image_path.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
              } catch (deleteError) {
                // Continue even if deletion fails
              }
              }
            }
          }
          
          // Delete articles from database
          const result = await articlesCollection.deleteMany({ 
            _id: { $in: ids } 
          });
          
          return res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} article(s)`,
            deletedCount: result.deletedCount
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid article IDs'
          });
        }
      }
      
      // Single delete
      if (articleId) {
        try {
          // Get article to delete (to get image URL)
          const article = await articlesCollection.findOne({ 
            _id: new ObjectId(articleId) 
          });
          
          if (!article) {
            return res.status(404).json({
              success: false,
              error: 'Article not found'
            });
          }
          
          // Delete image from Cloudinary if it exists
          if (article.image_path && article.image_path.includes('cloudinary.com')) {
            const cloudinaryConfigured = configureCloudinary();
            if (cloudinaryConfigured) {
              try {
                const publicId = article.image_path.split('/').slice(-2).join('/').split('.')[0];
                await cloudinary.uploader.destroy(publicId);
              } catch (deleteError) {
                // Continue even if deletion fails
              }
            }
          }
          
          // Delete article from database
          const result = await articlesCollection.deleteOne({ 
            _id: new ObjectId(articleId) 
          });
          
          if (result.deletedCount === 0) {
            return res.status(404).json({
              success: false,
              error: 'Article not found'
            });
          }
          
          return res.status(200).json({
            success: true,
            message: 'Article deleted successfully'
          });
        } catch (error) {
          return res.status(400).json({
            success: false,
            error: 'Invalid article ID'
          });
        }
      }
      
      return res.status(400).json({
        success: false,
        error: 'Article ID or IDs required'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}




