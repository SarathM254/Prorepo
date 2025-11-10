# Proto - Campus News Website

A modern, responsive campus news platform with user authentication and MVC architecture.

## Quick Start

1. **Install & Run**:
```bash
cd backend
npm install
npm start
```

2. **Access**: Open `http://localhost:3000`

3. **Default Login**:
   - Email: `admin@proto.com`
   - Password: `admin123`

## 📁 Project Structure (MVC Architecture)

```
Proto/
├── css/                        # CSS Modules (9 files)
│   ├── base.css               # Foundation styles
│   ├── header.css             # Top navigation
│   ├── navigation.css         # Bottom nav
│   ├── cards.css              # Article cards
│   ├── forms.css              # Submission form
│   ├── profile.css            # Profile modal
│   ├── footer.css             # Footer
│   ├── loading.css            # Loading states
│   └── auth.css               # Login/register
│
├── js/                         # JavaScript Modules (8 files)
│   ├── models/
│   │   └── ArticleModel.js    # Data & API calls
│   ├── views/
│   │   ├── ArticleView.js     # Article rendering
│   │   ├── ProfileView.js     # Profile UI
│   │   └── FormView.js        # Form UI
│   ├── controllers/
│   │   └── AppController.js   # Business logic
│   ├── utils/
│   │   └── helpers.js         # Helper functions
│   ├── auth/
│   │   └── login.js           # Authentication
│   └── app.js                 # Entry point
│
├── backend/
│   ├── server.js              # Express server & API
│   ├── database.js            # SQLite database
│   └── package.json
│
├── index.html                 # Main page
└── login.html                 # Login/register page
```

## 🎯 Code Organization (MVC Pattern)

**Model** (`js/models/`) - Handles data and API calls
- `ArticleModel.js` - Fetch/submit articles, user profile, logout

**View** (`js/views/`) - Handles UI rendering
- `ArticleView.js` - Renders articles and layouts
- `ProfileView.js` - Renders profile modal
- `FormView.js` - Renders article submission form

**Controller** (`js/controllers/`) - Handles logic and events
- `AppController.js` - Connects models and views, event handling

**Utils** (`js/utils/`) - Helper functions
- `helpers.js` - Time formatting, utilities

## ✨ Features

### User Features
- 🔐 Login/Registration with secure authentication
- 👤 Profile management (view/edit)
- 📝 Article submission form
- 📱 Fully responsive (mobile/tablet/desktop)
- ♾️ Infinite scroll on mobile
- 🎨 Modern, clean UI

### Technical Features
- **MVC Architecture** - Clean separation of concerns
- **Modular CSS** - 9 component-based files
- **Modular JS** - 8 organized modules
- **Session Management** - Secure cookie-based sessions
- **SQLite Database** - Lightweight, file-based
- **RESTful API** - Clean API endpoints

## 🔌 API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - Create account
- `POST /api/logout` - Logout
- `GET /api/auth/status` - Check auth status

### Articles
- `GET /api/articles` - Get all articles
- `POST /api/articles` - Submit new article

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update profile

## 🛠️ Quick Reference

### Need to modify...?

| What | Files |
|------|-------|
| Article display | `css/cards.css` + `js/views/ArticleView.js` |
| Login page | `css/auth.css` + `js/auth/login.js` |
| Submission form | `css/forms.css` + `js/views/FormView.js` |
| Profile modal | `css/profile.css` + `js/views/ProfileView.js` |
| Navigation | `css/navigation.css` or `css/header.css` |
| API calls | `js/models/ArticleModel.js` |
| Business logic | `js/controllers/AppController.js` |
| Responsive design | `@media` queries in CSS files |

## 📱 Responsive Breakpoints

- **Mobile**: ≤768px (single column, infinite scroll, bottom nav)
- **Tablet**: 769-1024px (2 columns)
- **Desktop**: ≥1025px (3 columns, fixed grid)

## 🔧 Development Tips

### Adding New Features
1. **Model**: Add data operations in `js/models/ArticleModel.js`
2. **View**: Add rendering in appropriate view file
3. **Controller**: Add event handling in `js/controllers/AppController.js`
4. **Styles**: Create or update relevant CSS file

### File Organization Rules
- Keep files under 300 lines
- One responsibility per file
- CSS organized by component
- JS organized by MVC layer

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Port 3000 in use | Change PORT in `server.js` or kill process |
| Database errors | Delete `proto.db` and restart server |
| Session issues | Enable cookies, use `localhost:3000` |
| Styling broken | Check browser console, verify CSS files load |
| JS errors | Check console, verify script loading order |

## 🔒 Security

- ✅ Passwords hashed with bcrypt
- ✅ Server-side session management
- ✅ Input validation on all endpoints
- ✅ CORS configured for development

## 📦 Dependencies

**Backend** (see `backend/package.json`):
- express - Web server
- express-session - Session management
- bcrypt - Password hashing
- sqlite3 - Database
- cors - Cross-origin requests
- multer - File uploads

## 🚀 Production Deployment (Optional)

For production, consider:
1. Use environment variables for secrets
2. Enable HTTPS
3. Use production database (PostgreSQL/MySQL)
4. Add module bundling (Webpack)
5. Minify CSS/JS
6. Add caching headers
7. Implement rate limiting

## 📝 Notes

- This is a **campus news website** with article submission capabilities
- Code is organized in **MVC pattern** for maintainability
- **Mobile-first design** with full responsive support
- All original monolithic files have been split into modules
- Website functionality remains **100% identical** to before reorganization

---

**Version**: 2.0 (Modular Architecture)  
**Last Updated**: November 10, 2025
