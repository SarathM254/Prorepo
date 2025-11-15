/**
 * Vercel Serverless Function - Profile
 * Handle user profile GET and UPDATE
 */

// Demo user (in production, fetch from database based on session/JWT)
let CURRENT_USER = {
    id: 1,
    name: 'Demo User',
    email: 'demo@proto.com'
};

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET - Fetch user profile
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            user: CURRENT_USER
        });
    }

    // PUT - Update user profile
    if (req.method === 'PUT') {
        const { name, email } = req.body;

        if (!name || !email) {
            return res.status(400).json({
                success: false,
                error: 'Name and email are required'
            });
        }

        // Update user (in production, update in database)
        CURRENT_USER.name = name;
        CURRENT_USER.email = email;

        return res.status(200).json({
            success: true,
            user: CURRENT_USER,
            message: 'Profile updated successfully'
        });
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

