/**
 * Vercel Serverless Function - Login
 * For production, connect to MongoDB Atlas or use Vercel KV
 */

// Demo users (replace with database in production)
const DEMO_USERS = [
    {
        id: 1,
        name: 'Admin User',
        email: 'admin@proto.com',
        password: 'admin123' // In production, use bcrypt hashed passwords
    },
    {
        id: 2,
        name: 'John Doe',
        email: 'john@proto.com',
        password: 'john123'
    }
];

export default function handler(req, res) {
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

    // Find user
    const user = DEMO_USERS.find(u => u.email === email);

    if (!user) {
        return res.status(404).json({
            success: false,
            error: 'Email not found'
        });
    }

    if (user.password !== password) {
        return res.status(401).json({
            success: false,
            error: 'Incorrect password'
        });
    }

    // In production, create JWT token or session
    const userResponse = {
        id: user.id,
        name: user.name,
        email: user.email
    };

    res.status(200).json({
        success: true,
        user: userResponse,
        message: 'Login successful'
    });
}

