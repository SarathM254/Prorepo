/**
 * Vercel Serverless Function - Auth Status
 * Check if user is authenticated
 */

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version, Authorization');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // Check for auth token in Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(200).json({
            authenticated: false
        });
    }

    // Extract user info from token (in real app, verify JWT)
    // For demo, token format: "Bearer email:name"
    try {
        const token = authHeader.substring(7); // Remove "Bearer "
        const [email, name] = token.split(':');
        
        if (email && name) {
            return res.status(200).json({
                authenticated: true,
                user: {
                    id: 1,
                    name: decodeURIComponent(name),
                    email: decodeURIComponent(email)
                }
            });
        }
    } catch (error) {
        console.error('Token parsing error:', error);
    }

    res.status(200).json({
        authenticated: false
    });
}

