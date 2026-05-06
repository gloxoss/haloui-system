@echo off
setlocal
cd /d "%~dp0"

if not exist node_modules (
  echo Installation des dependances...
  call npm install
  if errorlevel 1 goto :fail
)

if not exist .next\BUILD_ID (
  echo Build de l'application...
  call npm run build
  if errorlevel 1 goto :fail
)

echo Demarrage de Haloui System...
start "Haloui System Server" cmd /c "cd /d %~dp0 && npm run start"
timeout /t 8 /nobreak >nul
start "" http://localhost:3000
exit /b 0

:fail
echo Echec du lancement.
pause
exit /b 1
