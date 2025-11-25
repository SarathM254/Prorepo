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
  if (cachedClient && cachedDb) {
    return { client: cachedClient, db: cachedDb };
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
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: 'Email and password are required'
    });
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Find user by email
    const normalizedEmail = email.toLowerCase().trim();
    const user = await usersCollection.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Invalid email. Try sign in instead'
      });
    }

    // Check if user has a password (Google users might not have one)
    if (!user.password) {
      return res.status(400).json({
        success: false,
        error: 'This account was created with Google. Please use "Continue with Google" to login, or set a password in your profile settings.',
        requiresGoogleLogin: true
      });
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);

    if (!isValidPassword) {
      return res.status(401).json({
        success: false,
        error: 'Invalid password'
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

    // Generate JWT token
    const userResponse = {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isSuperAdmin: isSuperAdmin
    };

    const token = generateToken(userResponse);

    res.status(200).json({
      success: true,
      user: userResponse,
      token: token,
      message: 'Login successful'
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
