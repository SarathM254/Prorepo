@echo off
echo ========================================
echo    Proto Campus News Website
echo ========================================
echo.
echo Starting backend server...
echo.

cd backend
echo Current directory: %CD%
echo.

echo Installing dependencies...
call npm install
echo.

echo Starting Node.js server...
echo Server will be available at: http://localhost:3000
echo.
echo Default login credentials:
echo Email: admin@proto.com
echo Password: admin123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

node server.js

