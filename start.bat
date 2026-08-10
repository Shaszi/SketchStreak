@echo off
title SketchStreak - launcher

echo Starting server...
start "SketchStreak Server" /d "%~dp0server" cmd /k "npm install && npm run dev"

echo Starting client...
start "SketchStreak Client" /d "%~dp0client" cmd /k "npm install && npm run dev"

echo.
echo App will be available at http://localhost:5173
timeout /t 3 >nul
start http://localhost:5173
