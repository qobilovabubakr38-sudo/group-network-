@echo off
chcp 65001 > nul
title FAMILY NETWORK — Premium Private Relatives Platform
echo ======================================================
echo ✨ FAMILY NETWORK — Ishga tushirilmoqda...
echo ======================================================
cd /d "%~dp0"
echo Server ishga tushmoqda: http://localhost:3000
start "" "http://localhost:3000"
node server/index.js
pause
