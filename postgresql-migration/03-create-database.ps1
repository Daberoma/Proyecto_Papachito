$ErrorActionPreference = 'Stop'

$psql = Get-ChildItem -LiteralPath 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not $psql) {
    throw 'No se encontró psql.exe. Ejecuta primero la instalación y verificación.'
}

$postgresPassword = Read-Host 'Contraseña del administrador postgres' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($postgresPassword)
$postgresPlain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)

try {
    $env:PGPASSWORD = $postgresPlain
    $roleExists = & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='papachito_app'"
    if ($roleExists -ne '1') {
        & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c 'CREATE ROLE papachito_app LOGIN'
        Write-Host 'Elige ahora la contraseña del usuario papachito_app. psql la pedirá dos veces y no la mostrará.'
        & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c '\password papachito_app'
    }
    $dbExists = & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='papachito_app'"
    if ($dbExists -ne '1') {
        & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE papachito_app OWNER papachito_app ENCODING 'UTF8'"
    }
    & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d papachito_app -v ON_ERROR_STOP=1 -f "$PSScriptRoot\sql\01-schema.sql"
    & $psql.FullName -h 127.0.0.1 -p 5432 -U postgres -d papachito_app -v ON_ERROR_STOP=1 -f "$PSScriptRoot\sql\02-reference-data.sql"
    Write-Host 'Base papachito_app creada y esquema aplicado.'
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    $postgresPlain = $null
}
