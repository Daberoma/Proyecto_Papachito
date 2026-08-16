$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$php = 'C:\laragon\bin\php\php-7.2.19-Win32-VC15-x64\php.exe'
$secretFile = Join-Path $root '.secrets\pg-password.xml'
$webBuild = Join-Path $root 'mobile\web-build'

if (-not (Test-Path $secretFile)) { exit 2 }
$secure = Import-Clixml -LiteralPath $secretFile
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }

# Reinicio fiable aunque Windows muestre solo "server.js" en la línea de proceso.
Get-NetTCPConnection -LocalPort 8090,8091 -State Listen -ErrorAction SilentlyContinue |
  Select-Object -ExpandProperty OwningProcess -Unique |
  ForEach-Object { Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }

$env:PAPACHITO_PG_PASSWORD = $password
Set-Location -LiteralPath (Join-Path $root 'backend-node')
Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $root 'backend-node') -WindowStyle Hidden
if (Test-Path $php) {
  # Un único argumento evita que PowerShell fragmente la ruta/opciones al iniciar PHP.
  Start-Process -FilePath $php -ArgumentList "-S 0.0.0.0:8091 -t `"$webBuild`"" -WorkingDirectory $webBuild -WindowStyle Hidden
  Start-Process 'http://127.0.0.1:8091/'
}
