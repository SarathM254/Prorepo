/**
 * Vercel Serverless Function - Register
 * Uses MongoDB Atlas for user storage with JWT tokens
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { generateToken } from './utils/jwt.js';

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
    serverSelectionTimeoutMS: 10000, // Increase to 10 seconds
    connectTimeoutMS: 10000, // Increase to 10 seconds
    socketTimeoutMS: 45000, // Add socket timeout
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

// Helper function to add timeout to promises
function withTimeout(promise, timeoutMs, errorMessage) {
  return Promise.race([
    promise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error(errorMessage)), timeoutMs)
    )
  ]);
}

export default async function handler(req, res) {
  // CRITICAL: Set Content-Type FIRST before anything else
  res.setHeader('Content-Type', 'application/json');
  
  // Track if response has been sent
  let responseSent = false;
  
  // Helper function to send JSON response safely
  const sendJSON = (status, data) => {
    if (responseSent) {
      console.error('Attempted to send response twice:', data);
      return;
    }
    responseSent = true;
    return res.status(status).json(data);
  };

  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
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

    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return sendJSON(400, {
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Validate field types
    if (typeof name !== 'string' || name.trim().length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Name is required'
      });
    }

    // Validate email format (basic check)
    if (typeof email !== 'string' || !email.includes('@')) {
      return sendJSON(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password type and length
    if (typeof password !== 'string' || password.length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Password is required'
      });
    }

    if (password.length < 6) {
      return sendJSON(400, {
        success: false,
        error: 'Password must be at least 6 characters long'
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
      const { db } = await withTimeout(
        connectToDatabase(),
        8000, // 8 second timeout
        'Database connection timeout'
      );
      const usersCollection = db.collection('users');

      // Validate email format with regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendJSON(400, {
          success: false,
          error: 'Invalid email format'
        });
      }

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return sendJSON(409, {
          success: false,
          error: 'This email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with isSuperAdmin field
      const normalizedEmail = email.toLowerCase().trim();
      const newUser = {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        created_at: new Date(),
        isSuperAdmin: normalizedEmail === 'motupallisarathchandra@gmail.com'
      };

      const result = await usersCollection.insertOne(newUser);

      // Generate JWT token (wrap in try-catch)
      let token;
      try {
        const userResponse = {
          id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
          isSuperAdmin: newUser.isSuperAdmin || false
        };
        token = generateToken(userResponse);
      } catch (tokenError) {
        console.error('JWT token generation failed:', tokenError);
        return sendJSON(500, {
          success: false,
          error: 'Authentication error. Please try again.'
        });
      }

      return sendJSON(201, {
        success: true,
        user: {
          id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
          isSuperAdmin: newUser.isSuperAdmin || false
        },
        token: token,
        message: 'Registration successful'
      });
    } catch (dbError) {
      // Log the full error for debugging (server-side only)
      console.error('Registration database error:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
        timestamp: new Date().toISOString(),
        email: email ? email.toLowerCase() : 'N/A'
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

      // Handle duplicate key errors (MongoDB)
      if (dbError.code === 11000 || dbError.message.includes('duplicate key')) {
        return sendJSON(409, {
          success: false,
          error: 'This email already exists'
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
    console.error('Registration handler error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      method: req.method,
      url: req.url,
      hasBody: !!req.body,
      envCheck: {
        hasMongoUri: !!process.env.MONGODB_URI,
        hasJwtSecret: !!process.env.JWT_SECRET
      }
    });

    // Only send response if not already sent
    if (!responseSent) {
      try {
        // Ensure Content-Type is set
        if (!res.headersSent || !res.getHeader('Content-Type')) {
          res.setHeader('Content-Type', 'application/json');
        }
        return res.status(500).json({
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        });
      } catch (sendError) {
        console.error('Failed to send error response:', sendError);
        // Last resort - try to send basic response
        try {
          res.status(500).end('{"success":false,"error":"Server error"}');
        } catch (finalError) {
          console.error('Complete failure to send response:', finalError);
        }
      }
    }
  }
}
