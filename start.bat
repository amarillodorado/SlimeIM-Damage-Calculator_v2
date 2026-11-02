@echo off
rem Double-click to start the calculator. Your browser opens it automatically.
setlocal
cd /d "%~dp0"
title Slime IM Damage Calc

where node >nul 2>nul
if errorlevel 1 (
  echo Node.js is not installed.
  echo Install the LTS version from https://nodejs.org/ and run this file again.
  start "" https://nodejs.org/
  pause
  exit /b 1
)

rem Keeps packages in sync after an update; quick when nothing changed.
echo Checking packages...
call npm install --no-audit --no-fund --loglevel=error
if errorlevel 1 (
  if not exist node_modules (
    echo Installing packages failed. Check your internet connection and try again.
    pause
    exit /b 1
  )
  echo Could not update packages, starting with the installed ones.
)

echo.
echo Starting Slime IM Damage Calc - the browser tab opens in a moment.
echo Close this window to stop the calculator.
echo.
call npm start
pause
