# Proto - Campus News Platform

## Overview

Proto is a modern, responsive campus news platform built with a clean MVC architecture. The website is deployed on Vercel and uses MongoDB Atlas for data persistence and Cloudinary for image storage. It features user authentication, article management, and a comprehensive admin panel for super administrators.

## Features

### User Features
- **User Authentication**: Email/password and Google OAuth login
- **Article Submission**: Submit articles with images, categories, and content
- **Profile Management**: View and edit user profile
- **Responsive Design**: Optimized for mobile, tablet, and desktop
- **Infinite Scroll**: Seamless article loading on mobile devices

### Admin Features
- **Super Admin Panel**: Complete user and article management
- **Article Moderation**: Approve, edit, or delete articles
- **User Management**: View, create, and manage user accounts
- **Bulk Operations**: Delete multiple articles or users at once

### Technical Features
- **Image Optimization**: Automatic image compression and CDN delivery via Cloudinary
- **Real-time Updates**: Dynamic content loading without page refresh
- **Secure Authentication**: Token-based authentication with bcrypt password hashing
- **Database Integration**: MongoDB Atlas for scalable data storage

## Architecture

### MVC Pattern Implementation

**Model Layer** (`js/models/`)
- `ArticleModel.js` - Handles all data operations and API communications
- Manages article fetching, submission, and profile operations

**View Layer** (`js/views/`)
- `ArticleView.js` - Renders article cards in responsive grid layouts
- `ProfileView.js` - Manages profile display and navigation
- `FormView.js` - Handles article submission form with image adjustment
- `AdminPanelView.js` - Admin interface rendering

**Controller Layer** (`js/controllers/`)
- `AppController.js` - Central business logic coordinator
- `ProfileController.js` - Profile page logic and user management

### Technology Stack

**Frontend:**
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3
- Responsive CSS Grid and Flexbox
- Font Awesome icons
- Google Fonts (Inter)

**Backend:**
- Vercel Serverless Functions
- MongoDB Atlas (NoSQL database)
- Cloudinary (Image storage and CDN)
- Google OAuth 2.0

**Security:**
- bcrypt for password hashing
- Bearer token authentication
- CORS configuration
- Input validation and sanitization

## Implementation Details

### Authentication System
- Dual authentication: Email/password and Google OAuth
- User synchronization: Same email = same account across login methods
- Super admin detection: Automatic privilege elevation for specific email
- Session management: Token-based authentication with localStorage

### Article Management
- Image upload to Cloudinary with automatic optimization
- Article categorization (Campus, Sports, Events, Opinion)
- Status management (approved/pending)
- Real-time article display with infinite scroll on mobile

### Image Processing
- Client-side image adjustment before upload
- Cloudinary transformations: 1500x1100px, auto quality, WebP format
- CDN delivery for fast global loading
- Automatic image deletion when articles are removed

### Database Schema

**Users Collection:**
- `_id`, `name`, `email`, `password`, `isSuperAdmin`, `googleId`, `googlePicture`, `authProvider`, `created_at`

**Articles Collection:**
- `_id`, `title`, `body`, `tag`, `image_path`, `author_name`, `user_id`, `status`, `created_at`

## API Endpoints

**Authentication:**
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `GET /api/auth/status` - Check authentication
- `GET /api/auth/google` - Google OAuth flow
- `POST /api/logout` - Logout

**Articles:**
- `GET /api/articles` - Fetch all approved articles
- `POST /api/articles` - Create new article

**Profile:**
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

**Admin (Super Admin Only):**
- `GET /api/admin/articles` - List all articles
- `PUT /api/admin/articles` - Update article
- `DELETE /api/admin/articles` - Delete article(s)
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create user
- `DELETE /api/admin/users` - Delete user(s)

## File Structure

```
Proto/
├── api/                    # Vercel serverless functions
│   ├── articles.js        # Article operations
│   ├── login.js           # Authentication
│   ├── register.js        # Registration
│   ├── profile.js         # Profile management
│   ├── auth/              # Auth endpoints
│   │   ├── status.js      # Auth status check
│   │   └── google.js      # Google OAuth
│   └── admin/             # Admin APIs
│       ├── articles.js    # Article management
│       ├── users.js       # User management
│       └── wipe-users.js # Bulk user operations
│
├── js/
│   ├── models/            # Data layer
│   ├── views/             # UI layer
│   ├── controllers/       # Logic layer
│   ├── utils/             # Helper functions
│   ├── auth/              # Auth logic
│   └── config/            # Configuration
│
├── css/                   # Modular stylesheets
├── index.html             # Main application
├── login.html             # Login page
├── profile.html           # Profile page
└── admin.html             # Admin panel
```

## Responsive Design

- **Mobile (≤768px)**: Single column, infinite scroll, bottom navigation
- **Tablet (769-1024px)**: Two column grid
- **Desktop (≥1025px)**: Three column fixed grid

## Security Features

- Password hashing with bcrypt
- Bearer token authentication
- Server-side validation
- CORS configuration
- Super admin verification
- Input sanitization

## Performance Optimizations

- MongoDB connection caching for serverless functions
- Cloudinary CDN for global image delivery
- Automatic image optimization and compression
- Lazy loading for article images
- Efficient DOM updates
- LocalStorage caching for auth state

## Deployment

The application is deployed on Vercel with:
- MongoDB Atlas for database
- Cloudinary for image storage
- Google OAuth for authentication
- Environment variables for secure configuration

## Browser Support

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox
- LocalStorage API

---

**Version**: Production-ready  
**License**: MIT
