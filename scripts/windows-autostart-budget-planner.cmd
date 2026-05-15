@echo off
setlocal
cd /d "%~dp0\.."
start "Budget Planner" cmd /k "npm run dev"
timeout /t 8 /nobreak >nul
start "" "http://localhost:3000"
endlocal
