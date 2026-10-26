@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js est introuvable. Installe-le depuis https://nodejs.org puis relance ce fichier.
  pause
  exit /b 1
)
if not exist "server.js" (
  echo server.js doit se trouver dans le meme dossier que ce fichier.
  pause
  exit /b 1
)
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\atelier-du-codeur-serveur.vbs"
> "%VBS%" echo Set sh = CreateObject("WScript.Shell")
>> "%VBS%" echo sh.CurrentDirectory = "%~dp0"
>> "%VBS%" echo sh.Run "cmd /c node server.js", 0, False
echo Le serveur se lancera tout seul a chaque ouverture de session Windows.
echo Demarrage du serveur maintenant...
wscript "%VBS%"
echo.
echo C'est fait. Retourne sur la page de L'atelier du codeur : elle va le trouver toute seule.
echo (Pour supprimer le demarrage automatique : retirer-demarrage-automatique.bat)
pause
