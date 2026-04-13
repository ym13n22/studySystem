@echo off
echo ========================================
echo   AI Education System - Stop Services
echo ========================================
echo.

echo [INFO] Stopping all Node.js processes...
taskkill /F /IM node.exe >nul 2>&1

if %errorlevel% equ 0 (
    echo [SUCCESS] All Node.js processes stopped
) else (
    echo [INFO] No Node.js processes found
)

echo.
echo ========================================
echo   Services stopped
echo ========================================
echo.
pause
