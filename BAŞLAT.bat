@echo off
chcp 65001 >nul
title Kalıp Takip Sistemi
echo.
echo   ████████████████████████████████████████████████
echo   █                                              █
echo   █     KALIP TAKİP SİSTEMİ BAŞLATILIYOR...     █
echo   █                                              █
echo   ████████████████████████████████████████████████
echo.

cd /d "%~dp0"

:: Check if Node.js is installed
where node >nul 2>&1
if %errorlevel% neq 0 (
    echo   [HATA] Node.js bulunamadı!
    echo   Lütfen https://nodejs.org adresinden Node.js yükleyin.
    echo.
    pause
    exit /b 1
)

:: Install dependencies if needed
if not exist "node_modules" (
    echo   Gerekli paketler yükleniyor (ilk çalıştırma)...
    npm install --silent
    echo   Paketler yüklendi.
    echo.
)

:: Start server and open browser
echo   Sunucu başlatılıyor...
echo.
start "" http://localhost:3000
node server.js
