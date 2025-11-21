# Proto - Campus News Website

## Overview

Proto is a modern, responsive campus news platform built with a clean MVC architecture. The website is deployed on Vercel and uses MongoDB Atlas for data persistence and Cloudinary for image storage.

## Architecture & Design Patterns

### MVC (Model-View-Controller) Pattern

The application follows MVC architecture for clean separation of concerns:

**Model Layer** (`js/models/`)
- `ArticleModel.js` - Handles all data operations and API communications
  - Fetches articles from MongoDB Atlas
  - Submits new articles with images to Cloudinary
  - Manages user profile data
  - Handles authentication token management

**View Layer** (`js/views/`)
- `ArticleView.js` - Renders article cards in responsive grid layouts
  - Supports infinite scroll on mobile devices
  - Handles different screen sizes (mobile, tablet, desktop)
  - Displays article images from Cloudinary CDN
- `ProfileView.js` - Renders user profile modal
  - Shows user information and super admin indicators
  - Handles profile edit functionality
- `FormView.js` - Manages article submission form
  - Image preview and adjustment interface
  - Form validation and submission handling

**Controller Layer** (`js/controllers/`)
- `AppController.js` - Central business logic coordinator
  - Orchestrates interactions between models and views
  - Manages event handlers and user interactions
  - Handles infinite scroll logic for mobile
  - Controls authentication flow

### Utility Functions (`js/utils/`)
- `helpers.js` - Reusable helper functions
  - Time formatting utilities
  - Date manipulation helpers

## Core Features & Algorithms

### 1. Authentication System

**Registration Algorithm:**
- Email normalization (converts to lowercase, trims whitespace)
- Password hashing using bcrypt before storage
- Duplicate email prevention (case-insensitive check)
- Super admin automatic detection (specific email gets elevated privileges)
- Session token generation and storage

**Login Algorithm:**
- Email normalization and lookup in MongoDB
- Password verification using bcrypt comparison
- Session token creation and localStorage persistence
- Automatic super admin status detection and database update
- Error handling with specific messages for invalid email vs password

**Authentication Status Check:**
- Token validation via Bearer token in Authorization header
- User lookup in MongoDB to verify token validity
- Super admin status check and update if needed
- Returns user object with privileges

### 2. Article Management System

**Article Fetching Algorithm:**
- Connects to MongoDB Atlas (cached connection for serverless efficiency)
- Queries articles collection with status filter (approved articles only)
- Sorts by creation date (newest first)
- Returns paginated results for performance

**Article Submission Algorithm:**
1. Form validation (title, body, tag required)
2. Image processing:
   - Image file converted to base64
   - Image dimensions adjusted if needed (via canvas manipulation)
   - Image uploaded to Cloudinary with optimization settings
   - Cloudinary returns optimized CDN URL
3. Article data structure creation:
   - Combines text content with Cloudinary image URL
   - Sets author information from authenticated user
   - Timestamps with current date/time
   - Status set to 'approved'
4. MongoDB insertion with new article document
5. Response returns complete article object for immediate display

**Image Optimization Logic:**
- Client-side image adjustment before upload
- Cloudinary automatic transformations:
  - Width: 1500px
  - Height: 1100px
  - Crop: fill (maintains aspect ratio)
  - Quality: auto (optimal compression)
  - Format: auto (WebP when supported)
- CDN delivery for fast global image loading

### 3. Super Admin System

**Super Admin Detection Algorithm:**
- Email-based detection (specific email address)
- Automatic flag setting in database during login/registration
- Database migration logic (updates existing records if flag missing)
- Visual indicator (crown icon) displayed in navigation

**Admin Panel Access Control:**
- Server-side verification of super admin status
- Token-based authentication for admin API endpoints
- User management capabilities (view, create, delete users)
- Protection against self-deletion

### 4. Responsive Design Logic

**Layout Algorithm:**
- Mobile (≤768px): Single column, infinite scroll, bottom navigation
- Tablet (769-1024px): Two column grid, pagination
- Desktop (≥1025px): Three column grid, fixed layout

**Infinite Scroll Implementation:**
- Intersection Observer API for scroll detection
- Loads more articles when user scrolls near bottom (mobile only)
- Debounced scroll handler for performance
- Loading state management during data fetch

### 5. State Management

**Local Storage Strategy:**
- Authentication token stored in localStorage
- Super admin status cached for quick access
- Persistent login state across browser sessions

**Session Management:**
- Bearer token authentication
- Token validation on every protected API call
- Automatic redirect to login if token invalid/expired

## Data Flow Architecture

### Article Submission Flow:
```
User Input → FormView Validation → Image Processing → 
Base64 Conversion → API Call → Cloudinary Upload → 
Get CDN URL → MongoDB Save → Response → UI Update
```

### Article Loading Flow:
```
Page Load → AppController Init → ArticleModel Fetch → 
MongoDB Query → Data Transform → ArticleView Render → 
Responsive Layout Application
```

### Authentication Flow:
```
Login Form → Email/Password → API Validation → 
MongoDB Lookup → bcrypt Compare → Token Generation → 
localStorage Save → Redirect to Main App
```

## API Structure

All APIs are Vercel serverless functions located in `/api` folder:

**Authentication APIs:**
- `POST /api/login` - User authentication
- `POST /api/register` - New user registration
- `POST /api/logout` - Session termination
- `GET /api/auth/status` - Check authentication state

**Article APIs:**
- `GET /api/articles` - Fetch all approved articles
- `POST /api/articles` - Create new article with image

**Profile APIs:**
- `GET /api/profile` - Get user profile data
- `PUT /api/profile` - Update user profile

**Admin APIs (Super Admin Only):**
- `GET /api/admin/users` - List all users
- `POST /api/admin/users` - Create new user
- `DELETE /api/admin/users/:userId` - Delete specific user
- `DELETE /api/admin/users` - Delete all users (except super admin)

## Database Schema

**MongoDB Collections:**

**Users Collection:**
- `_id` - ObjectId (unique identifier)
- `name` - String (user's display name)
- `email` - String (unique, indexed, case-insensitive)
- `password` - String (bcrypt hashed)
- `isSuperAdmin` - Boolean (admin privileges flag)
- `created_at` - Date (account creation timestamp)

**Articles Collection:**
- `_id` - ObjectId (unique identifier)
- `title` - String (article headline)
- `body` - String (article content)
- `tag` - String (category: Campus, Sports, Events, Opinion)
- `image_path` - String (Cloudinary CDN URL)
- `author_name` - String (display name of author)
- `status` - String ('approved' | 'pending')
- `created_at` - Date (publication timestamp)

## Image Storage Strategy

**Cloudinary Configuration:**
- Images uploaded to 'proto-articles' folder
- Automatic format optimization (WebP conversion)
- Responsive image delivery via CDN
- Automatic compression for optimal file size
- Secure HTTPS URLs for all images

## Security Features

**Password Security:**
- bcrypt hashing with salt rounds
- Passwords never stored in plain text
- Secure password comparison

**API Security:**
- Bearer token authentication
- Server-side validation for all inputs
- CORS configuration for cross-origin requests
- Super admin verification on protected endpoints

**Data Validation:**
- Email format validation
- Input sanitization
- Required field checks
- File type validation for images

## Performance Optimizations

**Database Connection Caching:**
- MongoDB connection reused across serverless function invocations
- Connection health checks before reuse
- Automatic reconnection on failure

**Image Loading:**
- Cloudinary CDN for global distribution
- Automatic image optimization and compression
- Lazy loading for article images

**Frontend Optimizations:**
- Modular CSS files (load only needed styles)
- Debounced scroll handlers
- Efficient DOM updates
- LocalStorage caching for auth state

## File Organization

```
Proto/
├── api/                    # Vercel serverless functions
│   ├── articles.js        # Article CRUD operations
│   ├── login.js           # Authentication
│   ├── register.js        # User registration
│   ├── profile.js         # Profile management
│   └── admin/             # Admin APIs
│       └── users.js       # User management
│
├── js/
│   ├── models/            # Data layer
│   │   └── ArticleModel.js
│   ├── views/             # UI layer
│   │   ├── ArticleView.js
│   │   ├── ProfileView.js
│   │   └── FormView.js
│   ├── controllers/       # Logic layer
│   │   └── AppController.js
│   ├── utils/             # Helpers
│   │   └── helpers.js
│   └── auth/              # Auth logic
│       └── login.js
│
├── css/                   # Modular stylesheets
│   ├── base.css          # Foundation styles
│   ├── cards.css         # Article cards
│   ├── forms.css         # Form styling
│   ├── navigation.css    # Navigation bars
│   ├── profile.css       # Profile modal
│   └── ...
│
└── index.html            # Main application page
```

## Responsive Breakpoints

- **Mobile**: ≤768px - Single column, infinite scroll
- **Tablet**: 769-1024px - Two column grid
- **Desktop**: ≥1025px - Three column fixed grid

## Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES6+ JavaScript features
- CSS Grid and Flexbox support
- LocalStorage API support

---

**Last Updated**: Features and algorithms documentation
**Version**: Production-ready with MongoDB Atlas and Cloudinary integration
