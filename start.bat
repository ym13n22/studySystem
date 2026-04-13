@echo off
echo ========================================
echo   AI Education System MVP - Start
echo ========================================
echo.

REM Check backend .env file
if not exist "backend\.env" (
    echo [WARNING] backend\.env not found
    echo Please copy from backend\.env.example and configure GEMINI_API_KEY
    echo.
    pause
    exit /b 1
)

REM Check backend dependencies
if not exist "backend\node_modules" (
    echo [INFO] Installing backend dependencies...
    cd backend
    call npm install
    cd ..
    echo.
)

REM Check frontend dependencies
if not exist "frontend\node_modules" (
    echo [INFO] Installing frontend dependencies...
    cd frontend
    call npm install
    cd ..
    echo.
)

echo [INFO] Starting backend server...
start "AI Education Backend" cmd /k "cd /d %~dp0backend && npm start"

timeout /t 3 /nobreak >nul

echo [INFO] Starting frontend dev server...
start "AI Education Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

timeout /t 5 /nobreak >nul

echo [INFO] Opening browser...
start http://localhost:3000

echo.
echo ========================================
echo   Started!
echo   Backend: http://localhost:3001
echo   Frontend: http://localhost:3000
echo ========================================
echo.
echo Close service windows to stop servers
echo.
pause
