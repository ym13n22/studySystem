@echo off
echo ========================================
echo   AI Education System - Start Frontend
echo ========================================
echo.

REM Check dependencies
if not exist "node_modules" (
    echo [INFO] Installing dependencies...
    call npm install
    echo.
)

echo [INFO] Starting frontend dev server...
echo Frontend URL: http://localhost:3000
echo.
npm run dev
