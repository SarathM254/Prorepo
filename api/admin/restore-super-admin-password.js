/**
 * Vercel Serverless Function - Restore Super Admin Password
 * Restores password for super admin if it was accidentally cleared
 * This is a one-time fix endpoint
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';

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

const SUPER_ADMIN_EMAIL = 'motupallisarathchandra@gmail.com';
const DEFAULT_PASSWORD = 'SuperAdmin2024!'; // Default password - should be changed after first login

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

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

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
          isSuperAdmin: true // Ensure super admin flag is set
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
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}

