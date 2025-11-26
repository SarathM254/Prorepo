/**
 * Vercel Serverless Function - Authentication Operations (Consolidated)
 * Routes auth operations: status and google OAuth
 * Usage: 
 *   - /api/auth?action=status (or /api/auth/status for backward compatibility)
 *   - /api/auth?action=google (or /api/auth/google for backward compatibility)
 */

import { MongoClient } from 'mongodb';
import { OAuth2Client } from 'google-auth-library';
import { verifyToken, extractToken, generateToken } from './utils/jwt.js';

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

// Handle Auth Status Check
async function handleStatus(req, res) {
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
    
    // Determine if user needs password setup
    // Only Google OAuth users without password need to set one
    const authProvider = user.authProvider || 'email';
    const needsPasswordSetup = !user.password && (authProvider === 'google' || !user.authProvider);
    
    return res.status(200).json({
      authenticated: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        isSuperAdmin: isSuperAdmin,
        isAdmin: user.isAdmin || false,
        hasPassword: !!user.password,
        needsPasswordSetup: needsPasswordSetup,
        authProvider: authProvider
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

// Handle Google OAuth
async function handleGoogle(req, res) {
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
            // CRITICAL: Preserve existing password field for all users including super admin
            const updateData = {
              googleId: googleId,
              googlePicture: googlePicture,
              lastLogin: new Date()
            };

            // If user doesn't have a name, update it
            if (!user.name || user.name === 'User') {
              updateData.name = googleName;
            }

            // Set authProvider if not already set
            if (!user.authProvider) {
              updateData.authProvider = 'google';
            }

            // Log password status for debugging
            console.log(`Google login: User ${user.email} exists. Password status: ${user.password ? 'EXISTS' : 'MISSING'}`);

            await usersCollection.updateOne(
              { _id: user._id },
              { $set: updateData }
              // NOTE: We're only updating the fields in updateData
              // Password field is NOT in updateData, so it will be preserved automatically
            );

            // Refresh user data
            user = await usersCollection.findOne({ _id: user._id });
            
            // Verify password is still there
            if (user.password) {
              console.log(`Google login: Password preserved for ${user.email}`);
            }
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

export default async function handler(req, res) {
  // Determine action from query parameter or URL path
  // Support both /api/auth?action=status and /api/auth/status for backward compatibility
  const urlPath = req.url || '';
  let action = req.query.action;
  
  // If no action in query, check URL path
  if (!action) {
    if (urlPath.includes('/status')) {
      action = 'status';
    } else if (urlPath.includes('/google')) {
      action = 'google';
    }
  }
  
  // Default to status if no action specified
  if (!action) {
    action = 'status';
  }

  // Route based on action
  switch (action) {
    case 'status':
      return await handleStatus(req, res);
    case 'google':
      return await handleGoogle(req, res);
    default:
      return res.status(400).json({
        success: false,
        error: 'Invalid action parameter. Use: status or google'
      });
  }
}


