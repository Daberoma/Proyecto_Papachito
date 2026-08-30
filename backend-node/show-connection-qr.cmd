@echo off
title Papachito - Servidor y QR de conexion
cd /d "%~dp0.."
setlocal

rem La IP cambia entre redes y computadoras. Detectamos la primera IPv4 LAN
rem valida para que el QR funcione tambien en la computadora del cliente.
for /f "delims=" %%I in ('powershell -NoProfile -ExecutionPolicy Bypass -Command "$items=Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue; $fallback=$null; $selected=$null; foreach($item in $items){ $ip=$item.IPAddress; if($ip -match '^(127\.|169\.254\.)' -or $item.PrefixOrigin -eq 'WellKnown'){ continue }; if($ip -match '^(10\.|192\.168\.|172\.(1[6-9]|2[0-9]|3[0-1])\.)'){ $selected=$ip; break }; if(-not $fallback){$fallback=$ip} }; if($selected){$selected} elseif($fallback){$fallback}"') do set "LAN_IP=%%I"
if not defined LAN_IP set "LAN_IP=127.0.0.1"

echo.
echo ================================
echo   DONDE PAPACHITO - CONEXION
echo ================================
echo.
node backend-node\print-qr.js "http://%LAN_IP%:8090" "http://%LAN_IP%:8091"
echo.
echo IP detectada: %LAN_IP%
echo WEB: http://%LAN_IP%:8091/
echo API: http://%LAN_IP%:8090/
echo.
echo Esta ventana queda abierta para escanear el QR.
echo Para detener la ventana, presiona Ctrl+C o cierrala.
echo.
pause
