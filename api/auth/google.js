/**
 * Vercel Serverless Function - Google OAuth Authentication
 * Handles Google OAuth login and user synchronization with JWT tokens
 */

import { MongoClient } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
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

  await client.connect();
  const db = client.db('campuzway_main');

  cachedClient = client;
  cachedDb = db;

  return { client, db };
}

// Initialize Google OAuth client
function getGoogleClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID || '88133272458-5sutsbu1jole228ou132r719tjnoirc0.apps.googleusercontent.com';
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET || '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';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || 'https://proto-social.vercel.app/api/auth/google';
  
  if (!clientId || !clientSecret) {
    throw new Error('Google OAuth credentials not configured');
  }

  return new OAuth2Client(clientId, clientSecret, redirectUri);
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // GET - Handle OAuth callback or initiate flow
    if (req.method === 'GET') {
      const { code, error } = req.query;

      // Handle OAuth callback
      if (code) {
        try {
          const oauth2Client = getGoogleClient();
          
          // Exchange code for tokens
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);

          // Get user info from Google
          const clientId = process.env.GOOGLE_CLIENT_ID || '88133272458-5sutsbu1jole228ou132r719tjnoirc0.apps.googleusercontent.com';
          const ticket = await oauth2Client.verifyIdToken({
            idToken: tokens.id_token,
            audience: clientId
          });

          const payload = ticket.getPayload();
          const googleEmail = payload.email.toLowerCase().trim();
          const googleName = payload.name || payload.given_name || 'User';
          const googleId = payload.sub;
          const googlePicture = payload.picture;

          // Connect to database
          const { db } = await connectToDatabase();
          const usersCollection = db.collection('users');

          // Check if user exists (by email - sync with existing users)
          let user = await usersCollection.findOne({ email: googleEmail });

          if (user) {
            // User exists - update Google OAuth info if needed
            const updateData = {
              googleId: googleId,
              googlePicture: googlePicture,
              lastLogin: new Date()
            };

            // If user doesn't have a name, update it
            if (!user.name || user.name === 'User') {
              updateData.name = googleName;
            }

            await usersCollection.updateOne(
              { _id: user._id },
              { $set: updateData }
            );

            // Refresh user data
            user = await usersCollection.findOne({ _id: user._id });
          } else {
            // New user - create account
            const isSuperAdminEmail = googleEmail === 'motupallisarathchandra@gmail.com';
            
            const newUser = {
              name: googleName,
              email: googleEmail,
              password: null, // No password for Google OAuth users
              googleId: googleId,
              googlePicture: googlePicture,
              authProvider: 'google',
              created_at: new Date(),
              isSuperAdmin: isSuperAdminEmail
            };

            const result = await usersCollection.insertOne(newUser);
            user = await usersCollection.findOne({ _id: result.insertedId });
          }

          // Check if this is super admin email and update if needed
          const isSuperAdminEmail = googleEmail === 'motupallisarathchandra@gmail.com';
          let isSuperAdmin = user.isSuperAdmin || false;
          
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

          // Redirect to frontend with token
          const frontendUrl = process.env.FRONTEND_URL || 'https://proto-social.vercel.app';
          const redirectUrl = `${frontendUrl}/index.html?token=${encodeURIComponent(token)}`;
          return res.redirect(redirectUrl);
        } catch (error) {
          const frontendUrl = process.env.FRONTEND_URL || 'https://proto-social.vercel.app';
          const errorUrl = `${frontendUrl}/login.html?error=${encodeURIComponent(error.message || 'Google authentication failed')}`;
          return res.redirect(errorUrl);
        }
      }

      // Handle OAuth error
      if (error) {
        const frontendUrl = process.env.FRONTEND_URL || 'https://proto-social.vercel.app';
        const errorUrl = `${frontendUrl}/login.html?error=${encodeURIComponent('Google authentication was cancelled')}`;
        return res.redirect(errorUrl);
      }

      // Initiate OAuth flow
      try {
        const oauth2Client = getGoogleClient();
        const authUrl = oauth2Client.generateAuthUrl({
          access_type: 'offline',
          scope: [
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
          ],
          prompt: 'consent'
        });

        return res.redirect(authUrl);
      } catch (error) {
        return res.status(500).json({
          success: false,
          error: 'Failed to initialize Google OAuth'
        });
      }
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error) {
    return res.status(500).json({
      success: false,
      error: error.message || 'Internal server error'
    });
  }
}

