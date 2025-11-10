@echo off
echo Starting Proto Backend Server...
echo.
cd backend
echo Current directory: %CD%
echo.
echo Installing dependencies if needed...
call npm install
echo.
echo Starting server...
echo.
echo Server will start on http://localhost:3000
echo.
echo Press Ctrl+C to stop the server
echo.
node server.js
pause
