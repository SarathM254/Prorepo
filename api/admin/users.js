/**
 * Vercel Serverless Function - Admin Users Management
 * Super Admin only endpoints for user management
 */

import { MongoClient, ObjectId } from 'mongodb';
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

// Middleware to check if user is super admin
async function requireSuperAdmin(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const token = authHeader.substring(7);
  const [email] = token.split(':');
  
  if (!email) {
    return { authorized: false, error: 'Invalid token' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decodeURIComponent(email).toLowerCase() 
    });
    
    if (!user || !user.isSuperAdmin) {
      return { authorized: false, error: 'Super admin access required' };
    }
    
    return { authorized: true, user };
  } catch (error) {
    return { authorized: false, error: 'Database error' };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check super admin access
  const authCheck = await requireSuperAdmin(req);
  if (!authCheck.authorized) {
    return res.status(authCheck.error === 'Super admin access required' ? 403 : 401).json({
      success: false,
      error: authCheck.error
    });
  }

  try {
    const { db } = await connectToDatabase();
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
        created_at: user.created_at
      }));

      return res.status(200).json({
        success: true,
        users: formattedUsers
      });
    }

    // POST - Create new user
    if (req.method === 'POST') {
      const { name, email, password } = req.body;

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

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: 'Internal server error: ' + error.message
    });
  }
}

