@echo off
title VulnLab Server
cd /d "%~dp0"

echo ============================================================
echo   Starting VulnLab // NexusStore (Port 3000)
echo ============================================================

if not exist "node_modules\" (
    echo [INFO] Installing dependencies first...
    call npm install
)

echo [INFO] Launching browser at http://localhost:3000 in 3 seconds...
start "" cmd /c "timeout /t 3 /nobreak >nul && start http://localhost:3000"

echo [INFO] Starting Next.js development server...
call npm run dev

pause

