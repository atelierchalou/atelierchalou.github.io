@echo off
chcp 65001 >nul
set "VBS=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\atelier-du-codeur-serveur.vbs"
if exist "%VBS%" (
  del "%VBS%"
  echo Le demarrage automatique est retire.
) else (
  echo Le demarrage automatique n'etait pas active.
)
echo Pour arreter le serveur maintenant : redemarre l'ordinateur ou ferme "node.exe" dans le Gestionnaire des taches.
pause
