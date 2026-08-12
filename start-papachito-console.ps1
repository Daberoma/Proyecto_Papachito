$ErrorActionPreference = 'Stop'
$OutputEncoding = [Console]::OutputEncoding = [System.Text.UTF8Encoding]::new()
chcp 65001 | Out-Null
$root = $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$secretFile = Join-Path $root '.secrets\pg-password.xml'
if (-not (Test-Path $secretFile)) { Write-Host 'Falta configurar la contraseña PostgreSQL.'; exit 2 }

$background = Join-Path $root 'start-papachito-background.ps1'
Start-Process powershell.exe -ArgumentList @('-NoProfile','-ExecutionPolicy','Bypass','-WindowStyle','Hidden','-File',$background) -WindowStyle Hidden
Start-Sleep -Seconds 3

$lastIp = ''
Write-Host '========================================' -ForegroundColor Green
Write-Host '       DONDE PAPACHITO - CONEXION' -ForegroundColor Green
Write-Host '========================================' -ForegroundColor Green
while ($true) {
  $ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -match 'Wi-Fi|WLAN|Ethernet' } |
    Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|WLAN') { 0 } else { 1 } } |
    Select-Object -First 1 -ExpandProperty IPAddress
  if ($ip -and $ip -ne $lastIp) {
    $lastIp = $ip
    Clear-Host
    Write-Host '========================================' -ForegroundColor Green
    Write-Host '       DONDE PAPACHITO - CONEXION' -ForegroundColor Green
    Write-Host '========================================' -ForegroundColor Green
    Write-Host "Red detectada: $ip" -ForegroundColor Cyan
    Write-Host "API: http://${ip}:8090"
    Write-Host "Web: http://${ip}:8091"
    Write-Host 'Conecta el celular a esta misma red WiFi antes de escanear.' -ForegroundColor Yellow
    Write-Host ''
    & $node (Join-Path $root 'backend-node\print-qr.js') "http://${ip}:8090" "http://${ip}:8091"
    Write-Host ''
    Write-Host 'En la APK: Ajustes > Escanear QR de la laptop.' -ForegroundColor Yellow
    Write-Host 'Conecta el celular a esta misma red WiFi para escanear y sincronizar.' -ForegroundColor Yellow
    Write-Host 'Si cambia la red, este QR se actualiza automaticamente.' -ForegroundColor Yellow
  }
  Start-Sleep -Seconds 5
}
