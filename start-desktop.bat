@echo off
echo ========================================
echo Starting AI Education System Desktop App (Development)
echo ========================================
echo.

REM Check if frontend is running
echo Checking if Next.js dev server is running...
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% neq 0 (
    echo Next.js dev server is not running.
    echo Please run 'start-frontend.bat' first or use 'start.bat' to start both frontend and backend.
    pause
    exit /b 1
)
echo Next.js dev server is running
echo.

REM Install Electron dependencies if needed
echo Installing Electron dependencies...
cd electron
if not exist node_modules (
    call npm install
)
echo.

REM Start Electron in development mode
echo Starting Electron in development mode...
call npm start
