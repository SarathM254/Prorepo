/**
 * Vercel Serverless Function - Auth Status
 * Check if user is authenticated and get user info including super admin status
 * Uses JWT token verification
 */

import { MongoClient } from 'mongodb';
import { verifyToken, extractToken } from '../utils/jwt.js';

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

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Extract and verify JWT token
  const token = extractToken(req.headers.authorization);
  
  if (!token) {
    return res.status(200).json({
      authenticated: false
    });
  }

  // Verify JWT token
  const decoded = verifyToken(token);
  
  if (!decoded) {
    return res.status(200).json({
      authenticated: false
    });
  }

  // Look up user in database to get latest info
  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decoded.email.toLowerCase().trim()
    });
    
    // CRITICAL: If user doesn't exist, they were deleted - invalidate token
    if (!user) {
      return res.status(200).json({
        authenticated: false,
        error: 'User account no longer exists'
      });
    }
    
    // Check if this is super admin email and update if needed
    const isSuperAdminEmail = decoded.email.toLowerCase().trim() === 'motupallisarathchandra@gmail.com';
    let isSuperAdmin = user.isSuperAdmin || false;
    
    // If email matches super admin but DB doesn't have the flag, update it
    if (isSuperAdminEmail && !user.isSuperAdmin) {
      await usersCollection.updateOne(
        { _id: user._id },
        { $set: { isSuperAdmin: true } }
      );
      isSuperAdmin = true;
    }
    
      return res.status(200).json({
        authenticated: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdmin,
          isAdmin: user.isAdmin || false,
          hasPassword: !!user.password // Check if user has a password set
        }
      });
  } catch (dbError) {
    // If DB lookup fails, return unauthenticated for safety
    console.error('Database error in auth status check:', dbError);
    return res.status(200).json({
      authenticated: false,
      error: 'Authentication check failed'
    });
  }
}
