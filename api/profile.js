/**
 * Vercel Serverless Function - Profile
 * Uses MongoDB Atlas for user profile management with JWT tokens
 */

import { MongoClient } from 'mongodb';
import bcrypt from 'bcryptjs';
import { verifyToken, extractToken } from '../utils/jwt.js';

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

// Helper to get user from JWT token
function getUserFromToken(authHeader) {
  const token = extractToken(authHeader);
  if (!token) {
    return null;
  }
  
  const decoded = verifyToken(token);
  return decoded ? decoded.email : null;
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Get user email from token
    const userEmail = getUserFromToken(req.headers.authorization);
    
    if (!userEmail) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    // GET - Fetch user profile
    if (req.method === 'GET') {
      const normalizedEmail = userEmail.toLowerCase().trim();
      const user = await usersCollection.findOne({ email: normalizedEmail });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
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

      return res.status(200).json({
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          createdAt: user.created_at,
          isSuperAdmin: isSuperAdmin
        }
      });
    }

    // PUT - Update user profile
    if (req.method === 'PUT') {
      const { name, email, password, currentPassword } = req.body;

      // Handle password update separately
      if (password) {
        if (!currentPassword) {
          return res.status(400).json({
            success: false,
            error: 'Current password is required to set a new password'
          });
        }

        // Get current user
        const currentUser = await usersCollection.findOne({ email: userEmail.toLowerCase() });
        
        if (!currentUser) {
          return res.status(404).json({
            success: false,
            error: 'User not found'
          });
        }

        // If user has a password, verify current password
        if (currentUser.password) {
          const isValidPassword = await bcrypt.compare(currentPassword, currentUser.password);
          if (!isValidPassword) {
            return res.status(401).json({
              success: false,
              error: 'Current password is incorrect'
            });
          }
        }

        // Validate new password length
        if (password.length < 6) {
          return res.status(400).json({
            success: false,
            error: 'Password must be at least 6 characters long'
          });
        }

        // Hash and update password
        const hashedPassword = await bcrypt.hash(password, 10);
        await usersCollection.updateOne(
          { email: userEmail.toLowerCase() },
          { $set: { password: hashedPassword } }
        );

        // Fetch updated user
        const updatedUser = await usersCollection.findOne({ email: userEmail.toLowerCase() });
        const isSuperAdminEmail = updatedUser.email.toLowerCase().trim() === 'motupallisarathchandra@gmail.com';
        const isSuperAdmin = updatedUser.isSuperAdmin || isSuperAdminEmail;

        return res.status(200).json({
          success: true,
          user: {
            id: updatedUser._id.toString(),
            name: updatedUser.name,
            email: updatedUser.email,
            isSuperAdmin: isSuperAdmin
          },
          message: 'Password updated successfully'
        });
      }

      // Handle name/email update
      if (!name || !email) {
        return res.status(400).json({
          success: false,
          error: 'Name and email are required'
        });
      }

      // Get current user first
      const currentUser = await usersCollection.findOne({ email: userEmail.toLowerCase() });
      
      if (!currentUser) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if new email is already taken by another user
      const existingUser = await usersCollection.findOne({ 
        email: email.toLowerCase(),
        _id: { $ne: currentUser._id }
      });

      if (existingUser) {
        return res.status(409).json({
          success: false,
          error: 'Email already taken by another user'
        });
      }

      // Update user
      const result = await usersCollection.updateOne(
        { email: userEmail.toLowerCase() },
        { 
          $set: { 
            name: name.trim(),
            email: email.toLowerCase().trim()
          } 
        }
      );

      // Fetch updated user
      const updatedUser = await usersCollection.findOne({ email: email.toLowerCase() });

      // Check if this is super admin email
      const isSuperAdminEmail = updatedUser.email.toLowerCase().trim() === 'motupallisarathchandra@gmail.com';
      const isSuperAdmin = updatedUser.isSuperAdmin || isSuperAdminEmail;

      return res.status(200).json({
        success: true,
        user: {
          id: updatedUser._id.toString(),
          name: updatedUser.name,
          email: updatedUser.email,
          isSuperAdmin: isSuperAdmin
        },
        message: 'Profile updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error'
    });
  }
}
