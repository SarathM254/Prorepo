const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

// Create database connection
const dbPath = path.join(__dirname, 'proto.db');
const db = new sqlite3.Database(dbPath);

// Initialize database tables
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        db.serialize(() => {
            // Create users table
            db.run(`
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    name TEXT NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    password TEXT NOT NULL,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating users table:', err);
                    reject(err);
                } else {
                    console.log('Users table created successfully');
                }
            });

            // Create sessions table
            db.run(`
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    expires_at DATETIME,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating sessions table:', err);
                    reject(err);
                } else {
                    console.log('Sessions table created successfully');
                }
            });

            // Create articles table
            db.run(`
                CREATE TABLE IF NOT EXISTS articles (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    title TEXT NOT NULL,
                    body TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    image_path TEXT,
                    status TEXT DEFAULT 'pending',
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    FOREIGN KEY (user_id) REFERENCES users (id)
                )
            `, (err) => {
                if (err) {
                    console.error('Error creating articles table:', err);
                    reject(err);
                } else {
                    console.log('Articles table created successfully');
                }
            });

            // Create a default admin user for testing
            db.get("SELECT COUNT(*) as count FROM users WHERE email = 'admin@proto.com'", (err, row) => {
                if (err) {
                    console.error('Error checking admin user:', err);
                } else if (row.count === 0) {
                    const hashedPassword = bcrypt.hashSync('admin123', 10);
                    
                    db.run(`
                        INSERT INTO users (name, email, password) 
                        VALUES (?, ?, ?)
                    `, ['Admin User', 'admin@proto.com', hashedPassword], (err) => {
                        if (err) {
                            console.error('Error creating admin user:', err);
                        } else {
                            console.log('Default admin user created: admin@proto.com / admin123');
                            
                            // Add sample articles after creating admin user
                            addSampleArticles();
                        }
                    });
                } else {
                    // Check if sample articles exist
                    db.get("SELECT COUNT(*) as count FROM articles", (err, row) => {
                        if (!err && row.count === 0) {
                            addSampleArticles();
                        }
                    });
                }
            });

            resolve();
        });
    });
}

// Add sample articles
function addSampleArticles() {
    const sampleArticles = [
        {
            title: "Campus Innovation Lab Opens New Research Wing",
            body: "The university's new research facility promises to revolutionize student research opportunities with state-of-the-art equipment and collaborative spaces.",
            tag: "Campus",
            imagePath: "/uploads/article-1762767290577-874302685.png"
        },
        {
            title: "Basketball Team Wins Championship",
            body: "Our university basketball team secured their first championship in five years with a thrilling overtime victory. The final score was 78-75.",
            tag: "Sports",
            imagePath: "/uploads/article-1762939385038-344957785.jpg"
        },
        {
            title: "New Computer Science Program Launched",
            body: "The university introduces a cutting-edge AI and Machine Learning specialization track for computer science students.",
            tag: "Campus",
            imagePath: "/uploads/article-1762939443134-576020290.jpg"
        },
        {
            title: "Spring Festival 2024: A Grand Success",
            body: "Students and faculty came together for the annual spring festival featuring cultural performances, food stalls, and art exhibitions.",
            tag: "Events",
            imagePath: "/uploads/article-1762767290577-874302685.png"
        },
        {
            title: "Student Develops Revolutionary App",
            body: "Computer science student creates an app that helps students find study groups and collaborative learning opportunities.",
            tag: "Opinion",
            imagePath: "/uploads/article-1762939385038-344957785.jpg"
        },
        {
            title: "Breakthrough in Renewable Energy Research",
            body: "University researchers make significant progress in developing more efficient solar panel technology with improved efficiency rates.",
            tag: "Campus",
            imagePath: "/uploads/article-1762939443134-576020290.jpg"
        },
        {
            title: "New Student Center Opens Doors",
            body: "The newly constructed student center offers modern facilities including study rooms, recreational areas, and dining options.",
            tag: "Campus",
            imagePath: "/uploads/article-1762767290577-874302685.png"
        },
        {
            title: "Environmental Club Launches Campus Green Initiative",
            body: "Student-led environmental group introduces new recycling programs and sustainability workshops to promote eco-friendly practices on campus.",
            tag: "Campus",
            imagePath: "/uploads/article-1762939385038-344957785.jpg"
        },
        {
            title: "Drama Society's Winter Performance Sold Out",
            body: "The annual winter theater production received rave reviews with all shows completely sold out. Students showcased exceptional talent in acting and stage production.",
            tag: "Events",
            imagePath: "/uploads/article-1762939443134-576020290.jpg"
        },
        {
            title: "Career Fair Attracts Top Tech Companies",
            body: "Over 50 leading technology companies participated in this year's career fair, offering internships and full-time positions to graduating students.",
            tag: "Campus",
            imagePath: "/uploads/article-1762767290577-874302685.png"
        },
        {
            title: "University Debate Team Takes National Title",
            body: "Our debate team emerged victorious in the national championship, defeating teams from prestigious universities across the country.",
            tag: "Sports",
            imagePath: "/uploads/article-1762939385038-344957785.jpg"
        },
        {
            title: "New Library Wing Features Smart Study Pods",
            body: "The library expansion includes innovative study spaces with advanced technology, soundproof pods, and collaborative work areas for students.",
            tag: "Campus",
            imagePath: "/uploads/article-1762939443134-576020290.jpg"
        },
        {
            title: "Medical Research Team Makes COVID-19 Breakthrough",
            body: "University researchers contribute to significant advances in understanding virus transmission patterns and developing improved prevention strategies.",
            tag: "Opinion",
            imagePath: "/uploads/article-1762767290577-874302685.png"
        },
        {
            title: "International Food Festival Celebrates Diversity",
            body: "Students from over 40 countries showcased their cultural heritage through traditional cuisine, music, and performances at the annual diversity celebration.",
            tag: "Events",
            imagePath: "/uploads/article-1762939385038-344957785.jpg"
        },
        {
            title: "Robotics Club Wins Regional Competition",
            body: "The university robotics team secured first place in the regional competition with their innovative autonomous robot design and flawless performance.",
            tag: "Opinion",
            imagePath: "/uploads/article-1762939443134-576020290.jpg"
        }
    ];

    // Get admin user ID
    db.get("SELECT id FROM users WHERE email = 'admin@proto.com'", (err, user) => {
        if (err || !user) {
            console.error('Error getting admin user for sample articles:', err);
            return;
        }

        sampleArticles.forEach((article, index) => {
            db.run(`
                INSERT INTO articles (user_id, title, body, tag, image_path, status) 
                VALUES (?, ?, ?, ?, ?, ?)
            `, [user.id, article.title, article.body, article.tag, article.imagePath, 'approved'], (err) => {
                if (err) {
                    console.error('Error creating sample article:', err);
                } else if (index === sampleArticles.length - 1) {
                    console.log('Sample articles created successfully');
                }
            });
        });
    });
}

// User authentication functions
function authenticateUser(email, password) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM users WHERE email = ?",
            [email],
            (err, user) => {
                if (err) {
                    reject(err);
                } else if (!user) {
                    // User not found
                    resolve({ error: 'email' });
                } else {
                    // User found, check password
                    if (bcrypt.compareSync(password, user.password)) {
                        resolve({ user: user });
                    } else {
                        // Password incorrect
                        resolve({ error: 'password' });
                    }
                }
            }
        );
    });
}

function createUser(name, email, password) {
    return new Promise((resolve, reject) => {
        const hashedPassword = bcrypt.hashSync(password, 10);
        
        db.run(
            "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
            [name, email, hashedPassword],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, name, email });
                }
            }
        );
    });
}

function getUserById(id) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT id, name, email, created_at FROM users WHERE id = ?",
            [id],
            (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

function getUserByEmail(email) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT id, name, email, created_at FROM users WHERE email = ?",
            [email],
            (err, user) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(user);
                }
            }
        );
    });
}

// Session management functions
function createSession(userId, sessionId, expiresAt) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)",
            [sessionId, userId, expiresAt],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

function getSession(sessionId) {
    return new Promise((resolve, reject) => {
        db.get(
            "SELECT * FROM sessions WHERE id = ? AND expires_at > datetime('now')",
            [sessionId],
            (err, session) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(session);
                }
            }
        );
    });
}

function deleteSession(sessionId) {
    return new Promise((resolve, reject) => {
        db.run(
            "DELETE FROM sessions WHERE id = ?",
            [sessionId],
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

function cleanupExpiredSessions() {
    return new Promise((resolve, reject) => {
        db.run(
            "DELETE FROM sessions WHERE expires_at <= datetime('now')",
            (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

// Article functions
function createArticle(userId, title, body, tag, imagePath) {
    return new Promise((resolve, reject) => {
        db.run(
            "INSERT INTO articles (user_id, title, body, tag, image_path, status) VALUES (?, ?, ?, ?, ?, 'approved')",
            [userId, title, body, tag, imagePath],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ id: this.lastID, title, body, tag, imagePath });
                }
            }
        );
    });
}

function getArticlesByUser(userId) {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT * FROM articles WHERE user_id = ? ORDER BY created_at DESC",
            [userId],
            (err, articles) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(articles);
                }
            }
        );
    });
}

function getAllArticles() {
    return new Promise((resolve, reject) => {
        db.all(
            "SELECT a.*, u.name as author_name FROM articles a JOIN users u ON a.user_id = u.id WHERE a.status = 'approved' ORDER BY a.created_at DESC",
            [],
            (err, articles) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(articles);
                }
            }
        );
    });
}

function updateArticleStatus(articleId, status) {
    return new Promise((resolve, reject) => {
        db.run(
            "UPDATE articles SET status = ? WHERE id = ?",
            [status, articleId],
            function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            }
        );
    });
}

module.exports = {
    db,
    initializeDatabase,
    authenticateUser,
    createUser,
    getUserById,
    getUserByEmail,
    createSession,
    getSession,
    deleteSession,
    cleanupExpiredSessions,
    createArticle,
    getArticlesByUser,
    getAllArticles,
    updateArticleStatus
};
