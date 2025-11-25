/**
 * Vercel Serverless Function - Login
 * Uses MongoDB Atlas for user authentication with JWT tokens
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from '../utils/jwt.js';

// MongoDB connection (cached for serverless)
let cachedClient = null;
let cachedDb = null;

async function connectToDatabase() {
  // Check cache first
  if (cachedClient && cachedDb) {
    try {
      // Test connection
      await cachedClient.db('admin').command({ ping: 1 });
      return { client: cachedClient, db: cachedDb };
    } catch (error) {
      // Connection lost, clear cache
      console.warn('Cached connection failed, reconnecting...', error.message);
      cachedClient = null;
      cachedDb = null;
    }
  }

  // Validate environment variable
  if (!process.env.MONGODB_URI) {
    throw new Error('MONGODB_URI environment variable is not set');
  }

  const client = new MongoClient(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // 5 second timeout
    connectTimeoutMS: 5000,
  });

  try {
    await client.connect();
    const db = client.db('campuzway_main');
    
    // Test the connection
    await db.command({ ping: 1 });
    
    cachedClient = client;
    cachedDb = db;
    
    return { client, db };
  } catch (error) {
    // Close client if connection failed
    if (client) {
      try {
        await client.close();
      } catch (closeError) {
        // Ignore close errors
      }
    }
    throw new Error(`Database connection failed: ${error.message}`);
  }
}

export default async function handler(req, res) {
  // Track if response has been sent
  let responseSent = false;
  
  // Helper function to send JSON response safely
  const sendJSON = (status, data) => {
    if (responseSent) {
      console.error('Attempted to send response twice:', data);
      return;
    }
    responseSent = true;
    
    // Always set Content-Type header
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);
  };

  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
      return sendJSON(200, { success: true });
    }

    if (req.method !== 'POST') {
      return sendJSON(405, { 
        success: false,
        error: 'Method not allowed' 
      });
    }

    // Validate request body exists
    if (!req.body) {
      return sendJSON(400, {
        success: false,
        error: 'Request body is required'
      });
    }

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return sendJSON(400, {
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format (basic check)
    if (typeof email !== 'string' || !email.includes('@')) {
      return sendJSON(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password type
    if (typeof password !== 'string' || password.length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Password is required'
      });
    }

    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const normalizedEmail = email.toLowerCase().trim();
      const user = await usersCollection.findOne({ email: normalizedEmail });

      if (!user) {
        return sendJSON(404, {
          success: false,
          error: 'Invalid email'
        });
      }

      // Check if user has a password (Google users might not have one)
      if (!user.password) {
        return sendJSON(400, {
          success: false,
          error: 'This account was created with Google. Please use "Continue with Google" to login, or set a password in your profile settings.',
          requiresGoogleLogin: true
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return sendJSON(401, {
          success: false,
          error: 'Password is wrong'
        });
      }

      // Check if this is super admin email and update if needed
      const isSuperAdminEmail = normalizedEmail === 'motupallisarathchandra@gmail.com';
      let isSuperAdmin = user.isSuperAdmin || false;
      
      // If email matches super admin but DB doesn't have the flag, update it
      if (isSuperAdminEmail && !user.isSuperAdmin) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { isSuperAdmin: true } }
        );
        isSuperAdmin = true;
      }

      // Generate JWT token (wrap in try-catch)
      let token;
      try {
        const userResponse = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdmin
        };
        token = generateToken(userResponse);
      } catch (tokenError) {
        console.error('JWT token generation failed:', tokenError);
        return sendJSON(500, {
          success: false,
          error: 'Authentication error. Please try again.'
        });
      }

      return sendJSON(200, {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdmin
        },
        token: token,
        message: 'Login successful'
      });
    } catch (dbError) {
      // Log the full error for debugging (server-side only)
      console.error('Login database error:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types
      if (dbError.message && dbError.message.includes('MONGODB_URI')) {
        return sendJSON(500, {
          success: false,
          error: 'Database configuration error. Please contact support.'
        });
      }

      if (dbError.message && (dbError.message.includes('connect') || dbError.message.includes('Database connection failed'))) {
        return sendJSON(503, {
          success: false,
          error: 'Unable to connect to database. Please try again in a moment.'
        });
      }

      // Generic error - don't expose internal details to users
      return sendJSON(500, {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('Login handler error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // Only send response if not already sent
    if (!responseSent) {
      try {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        });
      } catch (sendError) {
        console.error('Failed to send error response:', sendError);
      }
    }
  }
}
