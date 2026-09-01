@echo off
title AROMALUXE Server
cd /d "%~dp0"
echo.
echo  ========================================
echo       AROMALUXE - Iniciando servidor...
echo  ========================================
echo.
echo  Tienda:   http://localhost:3000
echo  Admin:    http://localhost:3000/admin
echo.
echo  Presiona Ctrl+C para detener el servidor
echo.
node server.js
pause
