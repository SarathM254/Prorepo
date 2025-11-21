/**
 * Vercel Serverless Function - Bull Logo
 * Returns the bull logo URL from database or environment variable
 */

import { MongoClient } from 'mongodb';

// MongoDB connection
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

  await client.connect();
  const db = client.db('campuzway_main');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
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
    const configCollection = db.collection('app_config');

    // GET - Return the bull logo URL
    if (req.method === 'GET') {
      const config = await configCollection.findOne({ key: 'bull_logo_url' });
      
      // If not in database, check environment variable as fallback
      const logoUrl = config?.value || process.env.BULL_LOGO_URL;
      
      if (logoUrl) {
        return res.status(200).json({
          success: true,
          url: logoUrl
        });
      }
      
      // Final fallback - return null (frontend will handle)
      return res.status(200).json({
        success: true,
        url: null
      });
    }

    // PUT - Update the bull logo URL
    if (req.method === 'PUT') {
      const { url } = req.body;

      if (!url) {
        return res.status(400).json({
          success: false,
          error: 'URL is required'
        });
      }

      await configCollection.updateOne(
        { key: 'bull_logo_url' },
        { $set: { key: 'bull_logo_url', value: url, updatedAt: new Date() } },
        { upsert: true }
      );

      return res.status(200).json({
        success: true,
        url: url,
        message: 'Bull logo URL updated successfully'
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    console.error('Bull logo API error:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

