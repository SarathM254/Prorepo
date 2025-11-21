/**
 * Vercel Serverless Function - Auth Status
 * Check if user is authenticated and get user info including super admin status
 */

import { MongoClient } from 'mongodb';

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
    console.error('Auth status MongoDB connection error:', error);
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

  // Check for auth token in Authorization header
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(200).json({
      authenticated: false
    });
  }

  // Extract user info from token
  try {
    const token = authHeader.substring(7); // Remove "Bearer "
    const [email] = token.split(':');
    
    if (!email) {
      return res.status(200).json({
        authenticated: false
      });
    }

    // Look up user in database to get isSuperAdmin status
    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');
      
      const user = await usersCollection.findOne({ 
        email: decodeURIComponent(email).toLowerCase() 
      });
      
      if (user) {
        return res.status(200).json({
          authenticated: true,
          user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            isSuperAdmin: user.isSuperAdmin || false
          }
        });
      }
    } catch (dbError) {
      console.error('Database lookup error:', dbError);
      // Fall through to return authenticated: false
    }

    // Fallback: if database lookup fails, use token info
    const [decodedEmail, decodedName] = token.split(':').map(s => decodeURIComponent(s));
    if (decodedEmail && decodedName) {
      return res.status(200).json({
        authenticated: true,
        user: {
          id: 1,
          name: decodedName,
          email: decodedEmail,
          isSuperAdmin: false // Default to false if can't verify from DB
        }
      });
    }
  } catch (error) {
    console.error('Token parsing error:', error);
  }

  res.status(200).json({
    authenticated: false
  });
}
