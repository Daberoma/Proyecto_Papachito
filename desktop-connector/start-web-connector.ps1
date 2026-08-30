$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
if (-not (Test-Path -LiteralPath $node)) { $node = (Get-Command node.exe -ErrorAction Stop).Source }
$connectorPort = 8188
if (-not (Get-NetTCPConnection -LocalPort $connectorPort -State Listen -ErrorAction SilentlyContinue)) {
  Start-Process -FilePath $node -ArgumentList 'web-server.js' -WorkingDirectory $root -WindowStyle Hidden | Out-Null
  Start-Sleep -Milliseconds 700
}
$browsers = @(
    (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles} 'Microsoft\Edge\Application\msedge.exe'),
    (Join-Path ${env:ProgramFiles} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:LOCALAPPDATA} 'Google\Chrome\Application\chrome.exe'),
    (Join-Path ${env:ProgramFiles} 'BraveSoftware\Brave-Browser\Application\brave.exe')
) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }
if (-not $browsers) { throw 'No se encontró Edge, Chrome o Brave.' }
$profile = Join-Path $env:TEMP 'Papachito-conector-window'
Start-Process -FilePath $browsers[0] -ArgumentList @('--app=http://127.0.0.1:8188/','--new-window',"--user-data-dir=$profile") | Out-Null
