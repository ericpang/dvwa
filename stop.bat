@echo off
cd /d "%~dp0"

echo ============================================================
echo   Stopping VulnLab // NexusStore (Port 3000)
echo ============================================================

set FOUND=0
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    if not "%%a"=="0" (
        echo [INFO] Terminating process on port 3000 (PID: %%a)...
        taskkill /F /PID %%a >nul 2>&1
        set FOUND=1
    )
)

taskkill /F /FI "WINDOWTITLE eq VulnLab Server*" >nul 2>&1

if "%FOUND%"=="1" (
    echo [SUCCESS] VulnLab server on port 3000 has been stopped.
) else (
    echo [INFO] No active server found listening on port 3000.
)

timeout /t 2 >nul

