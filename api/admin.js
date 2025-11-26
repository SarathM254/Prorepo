/**
 * Vercel Serverless Function - Admin Operations (Consolidated)
 * Routes all admin operations: articles, users, wipe-users, restore-password
 * Usage: /api/admin?type=articles|users|wipe-users|restore-password
 */

import { MongoClient, ObjectId } from 'mongodb';
import { v2 as cloudinary } from 'cloudinary';
import bcrypt from 'bcryptjs';
import { verifyToken, extractToken } from './utils/jwt.js';

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
  const token = extractToken(req.headers.authorization);
  if (!token) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return { authorized: false, error: 'Invalid token' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decoded.email.toLowerCase() 
    });
    
    if (!user || !user.isSuperAdmin) {
      return { authorized: false, error: 'Super admin access required' };
    }
    
    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, error: 'Database error' };
  }
}

// Middleware to check if user is super admin OR admin
async function requireAdminAccess(req) {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return { authorized: false, error: 'Invalid token' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decoded.email.toLowerCase() 
    });
    
    // Allow if super admin OR admin
    if (!user || (!user.isSuperAdmin && !user.isAdmin)) {
      return { authorized: false, error: 'Admin access required' };
    }
    
    return { authorized: true, user, isSuperAdmin: user.isSuperAdmin || false };
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

// Handle Articles Operations
async function handleArticles(req, res, db) {
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
}

// Handle Users Operations
async function handleUsers(req, res, db) {
  const usersCollection = db.collection('users');

  // GET - List all users
  if (req.method === 'GET') {
    const users = await usersCollection
      .find({})
      .project({ password: 0 }) // Exclude password
      .sort({ created_at: -1 })
      .toArray();

    const formattedUsers = users.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin || false,
      isAdmin: user.isAdmin || false,
      created_at: user.created_at
    }));

    return res.status(200).json({
      success: true,
      users: formattedUsers
    });
  }

  // POST - Create new user
  if (req.method === 'POST') {
    const body = await parseRequestBody(req);
    const { name, email, password } = body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        error: 'This email is already used'
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user
    const normalizedEmail = email.toLowerCase().trim();
    const newUser = {
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
      created_at: new Date(),
      isSuperAdmin: normalizedEmail === 'motupallisarathchandra@gmail.com'
    };

    const result = await usersCollection.insertOne(newUser);

    return res.status(201).json({
      success: true,
      user: {
        id: result.insertedId.toString(),
        name: newUser.name,
        email: newUser.email,
        isSuperAdmin: newUser.isSuperAdmin
      },
      message: 'User created successfully'
    });
  }

  // DELETE - Delete user(s)
  if (req.method === 'DELETE') {
    const { userId } = req.query;

    // If userId is provided, delete specific user
    if (userId) {
      // Prevent deleting super admin
      const userToDelete = await usersCollection.findOne({ _id: new ObjectId(userId) });
      if (userToDelete && userToDelete.isSuperAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Cannot delete super admin user'
        });
      }

      const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });
      
      if (result.deletedCount === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'User deleted successfully'
      });
    } else {
      // Delete all users except super admin
      const result = await usersCollection.deleteMany({ isSuperAdmin: { $ne: true } });
      
      return res.status(200).json({
        success: true,
        message: `Deleted ${result.deletedCount} users`,
        deletedCount: result.deletedCount
      });
    }
  }

  // PATCH - Promote/Demote user to/from Admin
  if (req.method === 'PATCH') {
    const body = await parseRequestBody(req);
    const { userId, isAdmin } = body;

    if (!userId || typeof isAdmin !== 'boolean') {
      return res.status(400).json({
        success: false,
        error: 'userId and isAdmin (boolean) are required'
      });
    }

    // Prevent modifying super admin
    const userToModify = await usersCollection.findOne({ _id: new ObjectId(userId) });
    if (userToModify && userToModify.isSuperAdmin) {
      return res.status(403).json({
        success: false,
        error: 'Cannot modify super admin role'
      });
    }

    // Update user's admin status
    await usersCollection.updateOne(
      { _id: new ObjectId(userId) },
      { $set: { isAdmin: isAdmin } }
    );

    // Fetch updated user
    const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

    return res.status(200).json({
      success: true,
      user: {
        id: updatedUser._id.toString(),
        name: updatedUser.name,
        email: updatedUser.email,
        isSuperAdmin: updatedUser.isSuperAdmin || false,
        isAdmin: updatedUser.isAdmin || false
      },
      message: isAdmin ? 'User promoted to admin' : 'Admin demoted to user'
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Handle Wipe Users Operation
async function handleWipeUsers(req, res, db) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const usersCollection = db.collection('users');

  // Delete all users except those with isSuperAdmin = true
  const result = await usersCollection.deleteMany({ 
    isSuperAdmin: { $ne: true } 
  });

  return res.status(200).json({
    success: true,
    message: `Successfully wiped ${result.deletedCount} users. All existing credentials have been deleted.`,
    deletedCount: result.deletedCount
  });
}

// Handle Admins Operations (list all admins)
async function handleAdmins(req, res, db) {
  const usersCollection = db.collection('users');

  // GET - List all admins (super admins and regular admins)
  if (req.method === 'GET') {
    const admins = await usersCollection
      .find({
        $or: [
          { isSuperAdmin: true },
          { isAdmin: true }
        ]
      })
      .project({ password: 0 })
      .sort({ created_at: -1 })
      .toArray();

    const formattedAdmins = admins.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin || false,
      isAdmin: user.isAdmin || false,
      created_at: user.created_at
    }));

    return res.status(200).json({
      success: true,
      admins: formattedAdmins
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}

// Handle Restore Super Admin Password
async function handleRestorePassword(req, res, db) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const usersCollection = db.collection('users');
  const SUPER_ADMIN_EMAIL = 'motupallisarathchandra@gmail.com';
  const DEFAULT_PASSWORD = 'SuperAdmin2024!';

  // Find super admin by email
  const superAdmin = await usersCollection.findOne({ 
    email: SUPER_ADMIN_EMAIL.toLowerCase().trim() 
  });

  if (!superAdmin) {
    return res.status(404).json({
      success: false,
      error: 'Super admin user not found'
    });
  }

  // Check if password exists
  if (superAdmin.password) {
    return res.status(200).json({
      success: true,
      message: 'Super admin already has a password set. No action needed.',
      hasPassword: true
    });
  }

  // Hash and set default password
  const hashedPassword = await bcrypt.hash(DEFAULT_PASSWORD, 10);
  
  const result = await usersCollection.updateOne(
    { email: SUPER_ADMIN_EMAIL.toLowerCase().trim() },
    { 
      $set: { 
        password: hashedPassword,
        isSuperAdmin: true
      } 
    }
  );

  if (result.matchedCount === 0) {
    return res.status(404).json({
      success: false,
      error: 'Super admin user not found'
    });
  }

  return res.status(200).json({
    success: true,
    message: `Super admin password restored. Default password: ${DEFAULT_PASSWORD}. Please change it after login.`,
    email: SUPER_ADMIN_EMAIL,
    defaultPassword: DEFAULT_PASSWORD,
    warning: 'Please change this password immediately after logging in!'
  });
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const type = req.query.type || 'articles'; // Default to articles

    // Route based on type with appropriate authentication
    switch (type) {
      case 'articles':
        // Articles: Allow both Super Admin and Admin
        const articlesAuthCheck = await requireAdminAccess(req);
        if (!articlesAuthCheck.authorized) {
          return res.status(articlesAuthCheck.error === 'Admin access required' ? 403 : 401).json({
            success: false,
            error: articlesAuthCheck.error
          });
        }
        return await handleArticles(req, res, db);
      
      case 'users':
        // Users: Only Super Admin
        const usersAuthCheck = await requireSuperAdmin(req);
        if (!usersAuthCheck.authorized) {
          return res.status(usersAuthCheck.error === 'Super admin access required' ? 403 : 401).json({
            success: false,
            error: usersAuthCheck.error
          });
        }
        return await handleUsers(req, res, db);
      
      case 'admins':
        // Admins: Only Super Admin
        const adminsAuthCheck = await requireSuperAdmin(req);
        if (!adminsAuthCheck.authorized) {
          return res.status(adminsAuthCheck.error === 'Super admin access required' ? 403 : 401).json({
            success: false,
            error: adminsAuthCheck.error
          });
        }
        return await handleAdmins(req, res, db);
      
      case 'wipe-users':
        // Wipe users: Only Super Admin
        const wipeAuthCheck = await requireSuperAdmin(req);
        if (!wipeAuthCheck.authorized) {
          return res.status(wipeAuthCheck.error === 'Super admin access required' ? 403 : 401).json({
            success: false,
            error: wipeAuthCheck.error
          });
        }
        return await handleWipeUsers(req, res, db);
      
      case 'restore-password':
        // Restore password: Only Super Admin
        const restoreAuthCheck = await requireSuperAdmin(req);
        if (!restoreAuthCheck.authorized) {
          return res.status(restoreAuthCheck.error === 'Super admin access required' ? 403 : 401).json({
            success: false,
            error: restoreAuthCheck.error
          });
        }
        return await handleRestorePassword(req, res, db);
      
      default:
        return res.status(400).json({
          success: false,
          error: 'Invalid type parameter. Use: articles, users, admins, wipe-users, or restore-password'
        });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}


