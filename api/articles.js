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
        body: 'This is a demo article. Start by adding your own articles using the + button below! Proto makes it easy to share campus news, events, and updates with your community.',
        tag: 'Campus',
        image_url: 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=800&h=600&fit=crop',
        author: 'Admin User',
        created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString() // 30 min ago
    },
    {
        id: 2,
        title: 'Getting Started with Proto',
        body: 'Proto is your campus news platform. Share news, events, sports updates and opinions with your community. Connect with students and stay informed!',
        tag: 'Events',
        image_url: 'https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=800&h=600&fit=crop',
        author: 'Sarah Johnson',
        created_at: new Date(Date.now() - 1000 * 60 * 60).toISOString() // 1 hour ago
    },
    {
        id: 3,
        title: 'Campus Football Team Wins Championship',
        body: 'Our football team secured a thrilling victory in the finals! The team showed exceptional performance throughout the season.',
        tag: 'Sports',
        image_url: 'https://images.unsplash.com/photo-1579952363873-27f3bade9f55?w=800&h=600&fit=crop',
        author: 'Mike Chen',
        created_at: new Date(Date.now() - 1000 * 60 * 90).toISOString() // 1.5 hours ago
    },
    {
        id: 4,
        title: 'Annual Tech Fest Announced',
        body: 'Mark your calendars! The annual tech fest is happening next month. Expect workshops, competitions, and guest speakers from leading tech companies.',
        tag: 'Events',
        image_url: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=800&h=600&fit=crop',
        author: 'Emily Davis',
        created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString() // 2 hours ago
    },
    {
        id: 5,
        title: 'New Library Hours Extended',
        body: 'Great news! The campus library will now be open 24/7 during exam weeks. This includes access to study rooms and computer labs.',
        tag: 'Campus',
        image_url: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=800&h=600&fit=crop',
        author: 'Admin User',
        created_at: new Date(Date.now() - 1000 * 60 * 180).toISOString() // 3 hours ago
    },
    {
        id: 6,
        title: 'Student Art Exhibition Opens',
        body: 'The student art gallery is now showcasing incredible works from our talented art majors. Free admission for all students!',
        tag: 'Culture',
        image_url: 'https://images.unsplash.com/photo-1460661419201-fd4cecdf8a8b?w=800&h=600&fit=crop',
        author: 'Lisa Anderson',
        created_at: new Date(Date.now() - 1000 * 60 * 240).toISOString() // 4 hours ago
    },
    {
        id: 7,
        title: 'Campus Sustainability Initiative Launched',
        body: 'Join us in making our campus greener! New recycling programs and solar panels are being installed across campus buildings.',
        tag: 'Campus',
        image_url: 'https://images.unsplash.com/photo-1532996122724-e3c354a0b15b?w=800&h=600&fit=crop',
        author: 'Green Team',
        created_at: new Date(Date.now() - 1000 * 60 * 300).toISOString() // 5 hours ago
    },
    {
        id: 8,
        title: 'Guest Lecture: AI and the Future',
        body: 'Renowned AI researcher Dr. James Wilson will be speaking about artificial intelligence and its impact on society. Open to all students!',
        tag: 'Academic',
        image_url: 'https://images.unsplash.com/photo-1485827404703-89b55fcc595e?w=800&h=600&fit=crop',
        author: 'CS Department',
        created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString() // 6 hours ago
    },
    {
        id: 9,
        title: 'Basketball Tournament Results',
        body: 'Congratulations to all teams who participated in the inter-college basketball tournament. Finals this weekend!',
        tag: 'Sports',
        image_url: 'https://images.unsplash.com/photo-1546519638-68e109498ffc?w=800&h=600&fit=crop',
        author: 'Sports Committee',
        created_at: new Date(Date.now() - 1000 * 60 * 420).toISOString() // 7 hours ago
    },
    {
        id: 10,
        title: 'Career Fair Next Week',
        body: 'Top companies are coming to campus! Update your resumes and prepare for interviews. Great internship and job opportunities await.',
        tag: 'Career',
        image_url: 'https://images.unsplash.com/photo-1521737711867-e3b97375f902?w=800&h=600&fit=crop',
        author: 'Career Services',
        created_at: new Date(Date.now() - 1000 * 60 * 480).toISOString() // 8 hours ago
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

