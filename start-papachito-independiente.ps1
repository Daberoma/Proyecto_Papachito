$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$nodeDir = 'C:\Program Files\nodejs'

if (-not (Test-Path -LiteralPath "$nodeDir\npx.cmd")) {
    throw "No se encontro Node en $nodeDir"
}

$ip = Get-NetIPAddress -AddressFamily IPv4 |
    Where-Object { $_.IPAddress -notlike '127.*' -and $_.PrefixOrigin -ne 'WellKnown' -and $_.InterfaceAlias -match 'Wi-Fi|WLAN|Ethernet' } |
    Sort-Object { if ($_.InterfaceAlias -match 'Wi-Fi|WLAN') { 0 } else { 1 } } |
    Select-Object -First 1 -ExpandProperty IPAddress

if (-not $ip) {
    throw 'No se encontro una IP local activa. Conectate al Wi-Fi/hotspot y vuelve a ejecutar.'
}

$secure = Read-Host 'Contrasena de PostgreSQL papachito_app' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $pgPassword = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $apiEnv = @{
        PAPACHITO_PG_PASSWORD = $pgPassword
    }
}
finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}

Get-CimInstance Win32_Process |
    Where-Object { $_.CommandLine -like '*backend-node*server.js*' -or $_.CommandLine -like '*node.exe*server.js*' -or $_.CommandLine -like '*expo start --web --port 8091*' -or $_.CommandLine -like '*php*8091*web-build*' } |
    ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }

$apiScript = @"
`$env:PAPACHITO_PG_PASSWORD = '$($apiEnv.PAPACHITO_PG_PASSWORD.Replace("'", "''"))'
Set-Location -LiteralPath '$root\backend-node'
& '$nodeDir\node.exe' server.js
"@
$apiFile = Join-Path $env:TEMP 'papachito-api-start.ps1'
Set-Content -LiteralPath $apiFile -Value $apiScript -Encoding UTF8

Start-Process -FilePath 'powershell.exe' -ArgumentList @('-ExecutionPolicy','Bypass','-File',$apiFile) -WindowStyle Hidden
Start-Sleep -Milliseconds 600
Remove-Item -LiteralPath $apiFile -Force -ErrorAction SilentlyContinue

$env:EXPO_PUBLIC_API_URL = "http://$ip:8090"
Start-Process -FilePath 'C:\laragon\bin\php\php-7.2.19-Win32-VC15-x64\php.exe' -ArgumentList @('-S','0.0.0.0:8091','-t',"$root\mobile\web-build") -WorkingDirectory "$root\mobile" -WindowStyle Hidden

Start-Sleep -Seconds 6

Write-Host "Papachito independiente iniciado."
Write-Host "Web: http://$ip:8091"
Write-Host "API: http://$ip:8090/api/catalogo"
Write-Host "Si cambias de Wi-Fi, vuelve a ejecutar este script para actualizar la IP."
