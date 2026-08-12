$ErrorActionPreference = 'Stop'

$service = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match '^postgresql' -or $_.DisplayName -match 'PostgreSQL'
} | Select-Object -First 1

$psql = Get-ChildItem -LiteralPath 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
$listener = Get-NetTCPConnection -LocalPort 5432 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1

[pscustomobject]@{
    Installed = [bool]$psql
    Psql      = $psql.FullName
    Service   = $service.Name
    Status    = $service.Status
    Port5432  = [bool]$listener
} | Format-List

if (-not $psql -or -not $service -or $service.Status -ne 'Running' -or -not $listener) {
    throw 'La instalación todavía no está completa o el servicio no está iniciado.'
}

Write-Host 'PostgreSQL está instalado y escuchando localmente.'

