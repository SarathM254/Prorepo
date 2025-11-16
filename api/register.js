/**
 * Vercel Serverless Function - Register
 * Handle user registration
 */

// Demo users storage (in production, use MongoDB Atlas or Vercel KV)
const DEMO_USERS = [
    {
        id: 1,
        name: 'Admin User',
        email: 'admin@proto.com',
        password: 'admin123'
    }
];

export default function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({
            success: false,
            error: 'Name, email, and password are required'
        });
    }

    // Check if email already exists
    const existingUser = DEMO_USERS.find(u => u.email === email);
    if (existingUser) {
        return res.status(409).json({
            success: false,
            error: 'Email already registered'
        });
    }

    // Create new user
    const newUser = {
        id: DEMO_USERS.length + 1,
        name,
        email,
        password // In production, hash with bcrypt
    };

    DEMO_USERS.push(newUser);

    // Create auth token
    const token = `${encodeURIComponent(newUser.email)}:${encodeURIComponent(newUser.name)}`;

    const userResponse = {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email
    };

    res.status(201).json({
        success: true,
        user: userResponse,
        token: token,
        message: 'Registration successful'
    });
}

