$ErrorActionPreference = 'Stop'

$psql = Get-ChildItem -LiteralPath 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $psql) {
    throw 'No se encontro psql.exe.'
}

$postgresPassword = Read-Host 'Contrasena del administrador postgres' -AsSecureString
$newPassword = Read-Host 'Nueva contrasena para papachito_app' -AsSecureString

$postgresPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword)
$newPtr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($newPassword)

try {
    $env:PGPASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($postgresPtr)
    $newPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($newPtr)
    $escaped = $newPlain.Replace("'", "''")
    & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "ALTER ROLE papachito_app WITH PASSWORD '$escaped';"
    Write-Host 'Contrasena de papachito_app actualizada. Usala luego en backend\start-api.ps1.'
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($postgresPtr)
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($newPtr)
}
