/**
 * Vercel Serverless Function - One-time User Wipe
 * Wipes all existing users from database (except super admin if exists)
 * This is a one-time operation to clear all old credentials
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
    throw error;
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Check for authorization token
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'Unauthorized'
    });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Verify the requesting user is super admin
    const token = authHeader.substring(7);
    const [email] = token.split(':');
    
    if (!email) {
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    const normalizedEmail = decodeURIComponent(email).toLowerCase().trim();
    const requestingUser = await usersCollection.findOne({ email: normalizedEmail });

    // Only allow if email is super admin email
    if (normalizedEmail !== 'motupallisarathchandra@gmail.com') {
      return res.status(403).json({
        success: false,
        error: 'Only super admin can perform this action'
      });
    }

    // Delete all users except those with isSuperAdmin = true
    // This ensures we keep the super admin account if it exists
    const result = await usersCollection.deleteMany({ 
      isSuperAdmin: { $ne: true } 
    });

    return res.status(200).json({
      success: true,
      message: `Successfully wiped ${result.deletedCount} users. All existing credentials have been deleted.`,
      deletedCount: result.deletedCount
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}




