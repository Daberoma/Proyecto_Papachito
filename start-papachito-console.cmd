@echo off
title Donde Papachito
cd /d "%~dp0"
echo Iniciando Donde Papachito...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-papachito-windowless.ps1"
if errorlevel 1 (
  echo.
  echo No se pudo iniciar Papachito. Revisa el mensaje anterior.
  pause
  exit /b 1
)
echo.
echo Papachito se cerro correctamente.
pause
