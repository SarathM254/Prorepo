/**
 * Vercel Serverless Function - Register
 * Uses MongoDB Atlas for user storage with JWT tokens
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
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      success: false,
      error: 'Method not allowed' 
    });
  }

  // Validate request body exists
  if (!req.body) {
    return res.status(400).json({
      success: false,
      error: 'Request body is required'
    });
  }

  const { name, email, password } = req.body;

  // Validate required fields
  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Name, email, and password are required'
    });
  }

  // Validate field types
  if (typeof name !== 'string' || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Name is required'
    });
  }

  // Validate email format (basic check)
  if (typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({
      success: false,
      error: 'Invalid email format'
    });
  }

  // Validate password type and length
  if (typeof password !== 'string' || password.length === 0) {
    return res.status(400).json({
      success: false,
      error: 'Password is required'
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: 'Password must be at least 6 characters long'
    });
  }

  // Validate environment variables
  if (!process.env.MONGODB_URI) {
    console.error('MONGODB_URI is not configured');
    return res.status(500).json({
      success: false,
      error: 'Server configuration error. Please contact support.'
    });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid email format'
      });
    }

    // Check if email already exists
    const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
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

    // Generate JWT token
    const userResponse = {
      id: result.insertedId.toString(),
      name: newUser.name,
      email: newUser.email,
      isSuperAdmin: newUser.isSuperAdmin || false
    };

    const token = generateToken(userResponse);

    res.status(201).json({
      success: true,
      user: userResponse,
      token: token,
      message: 'Registration successful'
    });
  } catch (error) {
    // Log the full error for debugging (server-side only)
    console.error('Registration error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString(),
      email: email ? email.toLowerCase() : 'N/A'
    });

    // Handle specific error types
    if (error.message && error.message.includes('MONGODB_URI')) {
      return res.status(500).json({
        success: false,
        error: 'Database configuration error. Please contact support.'
      });
    }

    if (error.message && (error.message.includes('connect') || error.message.includes('Database connection failed'))) {
      return res.status(503).json({
        success: false,
        error: 'Unable to connect to database. Please try again in a moment.'
      });
    }

    // Handle duplicate key errors (MongoDB)
    if (error.code === 11000 || error.message.includes('duplicate key')) {
      return res.status(409).json({
        success: false,
        error: 'This email already exists'
      });
    }

    // Generic error - don't expose internal details to users
    return res.status(500).json({
      success: false,
      error: 'An unexpected error occurred. Please try again.'
    });
  }
}
