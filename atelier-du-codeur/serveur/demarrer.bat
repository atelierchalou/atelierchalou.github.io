@echo off
chcp 65001 >nul
cd /d "%~dp0"
title Serveur de L'atelier du codeur
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Installe-le depuis https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)
echo Le serveur de L'atelier du codeur est demarre. Laisse cette fenetre ouverte.
echo Pour l'arreter, ferme la fenetre.
echo.
node server.js
pause
