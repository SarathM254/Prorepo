const express = require('express');
const session = require('express-session');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
// const { v4: uuidv4 } = require('uuid'); // Not used in current implementation
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
// In a production environment, you should restrict the origin to your actual domain
const allowedOrigins = ['http://localhost:3000', 'http://127.0.0.1:3000'];
app.use(cors({
    origin: function (origin, callback) {
        // allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) === -1) {
            const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
            return callback(new Error(msg), false);
        }
        return callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Session configuration
app.use(session({
    // In production, use a long, random string from an environment variable
    secret: 'proto-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true in production with HTTPS
        httpOnly: true, // Helps prevent XSS attacks
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
}));

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, '..', 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'article-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Only image files are allowed'), false);
        }
    }
});

// Serve static files from the parent directory (frontend)
app.use(express.static(path.join(__dirname, '..'), {
    index: false // Disable automatic index serving
}));

// Serve uploaded images
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// Authentication middleware
function requireAuth(req, res, next) {
    if (req.session && req.session.userId) {
        next();
    } else {
        res.status(401).json({ error: 'Authentication required' });
    }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: 'Proto Backend is running' });
});

// Login route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }

        const result = await db.authenticateUser(email, password);
        
        if (result.user) {
            // Create session
            req.session.userId = result.user.id;
            req.session.userEmail = result.user.email;
            req.session.userName = result.user.name;
            
            res.json({
                success: true,
                user: {
                    id: result.user.id,
                    name: result.user.name,
                    email: result.user.email
                }
            });
        } else if (result.error === 'email') {
            res.status(404).json({ error: 'This email address is not registered.' });
        } else if (result.error === 'password') {
            res.status(401).json({ error: 'Invalid password.' });
        } else {
            res.status(401).json({ error: 'Invalid email or password' });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Register route
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;
        
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'Name, email, and password are required' });
        }

        // Check if user already exists
        const existingUser = await db.getUserByEmail(email);
        if (existingUser) {
            return res.status(400).json({ error: 'An account with this email already exists. Please sign in.' });
        }

        const user = await db.createUser(name, email, password);
        
        // Create session
        req.session.userId = user.id;
        req.session.userEmail = user.email;
        req.session.userName = user.name;
        
        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                email: user.email
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Logout route
app.post('/api/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
            res.status(500).json({ error: 'Could not log out' });
        } else {
            res.json({ success: true, message: 'Logged out successfully' });
        }
    });
});

// Check authentication status
app.get('/api/auth/status', (req, res) => {
    if (req.session && req.session.userId) {
        res.json({
            authenticated: true,
            user: {
                id: req.session.userId,
                name: req.session.userName,
                email: req.session.userEmail
            }
        });
    } else {
        res.json({ authenticated: false });
    }
});

// Get user profile
app.get('/api/profile', requireAuth, async (req, res) => {
    try {
        const user = await db.getUserById(req.session.userId);
        if (user) {
            res.json({
                success: true,
                user: {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    createdAt: user.created_at
                }
            });
        } else {
            res.status(404).json({ error: 'User not found' });
        }
    } catch (error) {
        console.error('Profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Update user profile
app.put('/api/profile', requireAuth, async (req, res) => {
    try {
        const { name, email } = req.body;
        
        if (!name || !email) {
            return res.status(400).json({ error: 'Name and email are required' });
        }

        // Check if email is already taken by another user
        const existingUser = await db.getUserByEmail(email);
        if (existingUser && existingUser.id !== req.session.userId) {
            return res.status(400).json({ error: 'Email already taken by another user' });
        }

        // Update user in database
        db.db.run(
            "UPDATE users SET name = ?, email = ? WHERE id = ?",
            [name, email, req.session.userId],
            function(err) {
                if (err) {
                    console.error('Update profile error:', err);
                    res.status(500).json({ error: 'Could not update profile' });
                } else {
                    // Update session
                    req.session.userName = name;
                    req.session.userEmail = email;
                    
                    res.json({
                        success: true,
                        user: {
                            id: req.session.userId,
                            name: name,
                            email: email
                        }
                    });
                }
            }
        );
    } catch (error) {
        console.error('Update profile error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Article routes
// Submit new article
app.post('/api/articles', requireAuth, upload.single('image'), async (req, res) => {
    try {
        const { title, body, tag } = req.body;
        
        if (!title || !body || !tag) {
            return res.status(400).json({ error: 'Title, body, and tag are required' });
        }

        if (!req.file) {
            return res.status(400).json({ error: 'Image is required' });
        }

        const imagePath = `/uploads/${req.file.filename}`;
        const article = await db.createArticle(req.session.userId, title, body, tag, imagePath);
        
        // Get user info to include in response
        const user = await db.getUserById(req.session.userId);
        
        res.json({
            success: true,
            article: {
                id: article.id,
                title: article.title,
                body: article.body,
                tag: article.tag,
                image_path: imagePath,
                author_name: user.name,
                created_at: new Date().toISOString()
            }
        });
    } catch (error) {
        console.error('Article creation error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get user's articles
app.get('/api/articles/my', requireAuth, async (req, res) => {
    try {
        const articles = await db.getArticlesByUser(req.session.userId);
        res.json({
            success: true,
            articles: articles
        });
    } catch (error) {
        console.error('Get user articles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Get all approved articles
app.get('/api/articles', async (req, res) => {
    try {
        const articles = await db.getAllArticles();
        res.json({
            success: true,
            articles: articles
        });
    } catch (error) {
        console.error('Get all articles error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Serve the main application
app.get('/', (req, res) => {
    if (req.session && req.session.userId) {
        res.sendFile(path.join(__dirname, '..', 'index.html'));
    } else {
        res.redirect('/login');
    }
});

// Serve login page
app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'login.html'));
});

// Catch-all handler for SPA routing (must be last)
app.use((req, res) => {
    // If it's an API route, return 404
    if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
    }
    
    // For all other routes, serve the main app
    res.sendFile(path.join(__dirname, '..', 'index.html'));
});

// Initialize database and start server
async function startServer() {
    try {
        await db.initializeDatabase();
        console.log('Database initialized successfully');
        
        app.listen(PORT, () => {
            console.log(`Proto Backend Server running on http://localhost:${PORT}`);
            console.log('Default admin credentials: admin@proto.com / admin123');
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
}

// Cleanup expired sessions every hour
setInterval(() => {
    db.cleanupExpiredSessions().catch(console.error);
}, 60 * 60 * 1000);

startServer();
