@echo off
echo ========================================
echo   AI Education System - Start Backend
echo ========================================
echo.

REM Check .env file
if not exist ".env" (
    echo [WARNING] .env not found
    echo Please copy from .env.example and configure GEMINI_API_KEY
    echo.
    pause
    exit /b 1
)

REM Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting backend server...
echo Backend URL: http://localhost:3001
echo.
npm start
