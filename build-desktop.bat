@echo off
echo ========================================
echo Building AI Education System Desktop App
echo ========================================
echo.

REM Step 1: Build Next.js for static export
echo [1/3] Building Next.js frontend for static export...
cd frontend
call npm run build:static
if %errorlevel% neq 0 (
    echo ERROR: Next.js build failed
    pause
    exit /b 1
)
echo Next.js build completed successfully
echo.

REM Step 2: Install Electron dependencies
echo [2/3] Installing Electron dependencies...
cd ..\electron
call npm install
if %errorlevel% neq 0 (
    echo ERROR: Electron dependencies installation failed
    pause
    exit /b 1
)
echo Electron dependencies installed successfully
echo.

REM Step 3: Build Electron app
echo [3/3] Building Electron desktop app...
call npm run build:win
if %errorlevel% neq 0 (
    echo ERROR: Electron build failed
    pause
    exit /b 1
)
echo Electron desktop app built successfully
echo.

echo ========================================
echo Build completed successfully!
echo Output directory: dist\
echo ========================================
pause
