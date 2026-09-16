@echo off
chcp 65001 > nul
title FAMILY NETWORK
cd /d "C:\Users\SAMSUNG\Desktop\family-network"
echo ======================================================
echo ✨ FAMILY NETWORK — Premium Private Relatives Platform
echo ======================================================
echo Server ishga tushirilmoqda...
start "" "http://localhost:3000"
node server/index.js
pause
