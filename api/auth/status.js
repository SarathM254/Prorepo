/**
 * Vercel Serverless Function - Auth Status
 * Check if user is authenticated
 */

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // For demo purposes, return authenticated with demo user
    // In production, check JWT token or session
    res.status(200).json({
        authenticated: true,
        user: {
            id: 1,
            name: 'Admin User',
            email: 'admin@proto.com'
        }
    });
}

