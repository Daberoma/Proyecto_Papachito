$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shortcut = Join-Path $desktop 'Donde Papachito.url'
$url = 'http://127.0.0.1:8091/'
$icon = (Join-Path $root 'mobile\icon.png').Replace('\','/')

@"
[InternetShortcut]
URL=$url
IconFile=$icon
IconIndex=0
"@ | Set-Content -LiteralPath $shortcut -Encoding ASCII

Write-Host "Acceso directo creado: $shortcut"
Write-Host 'Ejecuta install-papachito-startup.ps1 para iniciar servidor y abrirlo al iniciar Windows.'
