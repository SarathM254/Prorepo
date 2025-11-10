# Proto - Campus News Website

A modern, responsive campus news website with user authentication and profile management.

## Features

### Frontend
- **Responsive Design**: Mobile-first design that works on all devices
- **Inshorts-style Layout**: Card-based news layout similar to Inshorts
- **User Authentication**: Login/Register system with session management
- **Profile Management**: View and edit user profiles
- **Modern UI/UX**: Clean, professional interface with smooth animations

### Backend
- **Node.js/Express Server**: RESTful API with session management
- **SQLite Database**: Lightweight database for user data
- **Authentication**: Secure login/logout with password hashing
- **Profile Management**: Full CRUD operations for user profiles

## Installation & Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (Node Package Manager)

### Backend Setup

1. Navigate to the backend directory:
```bash
cd Proto/backend
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The backend server will start on `http://localhost:3000`

### Frontend Setup

The frontend files are already set up in the main Proto directory. The server serves the static files automatically.

## Usage

### Starting the Application

1. **Start the Backend Server**:
```bash
cd Proto/backend
npm start
```

2. **Access the Application**:
   - Open your browser and go to `http://localhost:3000`
   - You'll be redirected to the login page

### Default Credentials

For testing purposes, a default admin account is created:
- **Email**: admin@proto.com
- **Password**: admin123

### User Registration

1. Click "Create New Account" on the login page
2. Fill in your details (Name, Email, Password)
3. Click "Create Account"
4. You'll be automatically logged in and redirected to the main page

### Profile Management

1. Click on your profile icon in the bottom navigation (mobile) or top navigation (desktop)
2. View your profile details
3. Click "Edit Profile" to modify your information
4. Click "Logout" to sign out

## API Endpoints

### Authentication
- `POST /api/login` - User login
- `POST /api/register` - User registration
- `POST /api/logout` - User logout
- `GET /api/auth/status` - Check authentication status

### Profile
- `GET /api/profile` - Get user profile
- `PUT /api/profile` - Update user profile

## Project Structure

```
Proto/
├── backend/
│   ├── database.js          # Database setup and functions
│   ├── server.js            # Express server and API routes
│   ├── package.json         # Backend dependencies
│   └── proto.db             # SQLite database (created automatically)
├── index.html               # Main application page
├── login.html               # Login/Register page
├── style.css               # Main stylesheet
├── script.js               # Frontend JavaScript
└── README.md               # This file
```

## Features in Detail

### Mobile Experience
- **Full-screen cards**: Each news article takes up the full screen on mobile
- **Swipe-friendly**: Touch-optimized interface
- **Sticky navigation**: Header and bottom navigation stay in place
- **Responsive images**: Images scale properly on all devices

### Desktop Experience
- **Grid layout**: Multiple articles visible at once
- **Hover effects**: Interactive elements with smooth animations
- **Professional design**: Clean, modern interface

### Authentication System
- **Secure sessions**: Server-side session management
- **Password hashing**: bcrypt for secure password storage
- **Auto-redirect**: Automatic redirect to login if not authenticated
- **Profile persistence**: User data saved between sessions

### News Features
- **Card-based layout**: Clean, organized news display
- **Category tags**: Color-coded article categories
- **Author information**: Byline with author and timestamp
- **Action buttons**: Bookmark and share functionality
- **Infinite scroll**: Simulated loading of additional articles

## Development

### Adding New Features
1. Backend: Add new routes in `server.js`
2. Frontend: Add new functions in `script.js`
3. Database: Modify `database.js` for new data structures

### Customization
- **Styling**: Modify `style.css` for visual changes
- **Content**: Update `index.html` for new articles
- **Database**: Add new tables in `database.js`

## Troubleshooting

### Common Issues

1. **Port already in use**:
   - Change the PORT in `server.js` or kill the process using port 3000

2. **Database errors**:
   - Delete `proto.db` file and restart the server to recreate the database

3. **CORS issues**:
   - Ensure the frontend is served from the same origin as the backend

4. **Session not persisting**:
   - Check that cookies are enabled in your browser
   - Ensure you're accessing the site via `http://localhost:3000`

### Logs
Check the console output for any error messages. The server logs all database operations and API requests.

## Security Notes

- Passwords are hashed using bcrypt
- Sessions are stored server-side
- CORS is configured for local development
- Input validation on all API endpoints

## License

This project is for educational purposes. Feel free to modify and use as needed.
