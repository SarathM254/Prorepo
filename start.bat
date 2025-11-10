@echo off
echo Starting Proto Campus News Website...
echo.
echo Backend Server Starting...
cd backend
start cmd /k "npm start"
echo.
echo Backend server started on http://localhost:3000
echo.
echo Opening website in browser...
timeout /t 3 /nobreak > nul
start http://localhost:3000
echo.
echo Proto website is now running!
echo.
echo Default login credentials:
echo Email: admin@proto.com
echo Password: admin123
echo.
pause
