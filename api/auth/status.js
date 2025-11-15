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

    // For demo purposes, always return authenticated
    // In production, check JWT token or session from cookies/headers
    // Since Vercel serverless is stateless, proper auth requires external auth service or JWT
    res.status(200).json({
        authenticated: true,
        user: {
            id: 1,
            name: 'Demo User',
            email: 'demo@proto.com'
        }
    });
}

