$ErrorActionPreference = 'Stop'

$nodeDir = 'C:\Program Files\nodejs'
$env:Path = "$nodeDir;$env:Path"

Set-Location -LiteralPath $PSScriptRoot
& "$nodeDir\npx.cmd" expo start --web --port 8091 --clear
