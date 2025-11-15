/**
 * Vercel Serverless Function - Articles
 * Handle article CRUD operations
 * TODO: Connect to MongoDB Atlas or Vercel KV for persistence
 */

// Demo articles (in production, fetch from database)
let articles = [
    {
        id: 1,
        title: 'Welcome to Proto!',
        body: 'This is a demo article. Start by adding your own articles using the + button below!',
        tag: 'Campus',
        image_url: '/uploads/demo-article.jpg',
        author: 'Admin User',
        created_at: new Date().toISOString()
    },
    {
        id: 2,
        title: 'Getting Started with Proto',
        body: 'Proto is your campus news platform. Share news, events, sports updates and opinions with your community.',
        tag: 'Events',
        image_url: '/uploads/demo-article.jpg',
        author: 'Admin User',
        created_at: new Date().toISOString()
    }
];

export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    // GET - Fetch all articles
    if (req.method === 'GET') {
        return res.status(200).json({
            success: true,
            articles: articles.sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
        });
    }

    // POST - Create new article
    if (req.method === 'POST') {
        try {
            const { title, body, tag } = req.body;

            if (!title || !body || !tag) {
                return res.status(400).json({
                    success: false,
                    error: 'Title, body, and tag are required'
                });
            }

            const newArticle = {
                id: articles.length + 1,
                title,
                body,
                tag,
                image_url: '/uploads/demo-article.jpg', // In production, handle file uploads
                author: 'User',
                created_at: new Date().toISOString()
            };

            articles.push(newArticle);

            return res.status(201).json({
                success: true,
                article: newArticle,
                message: 'Article created successfully'
            });
        } catch (error) {
            return res.status(500).json({
                success: false,
                error: 'Failed to create article'
            });
        }
    }

    return res.status(405).json({ error: 'Method not allowed' });
}

