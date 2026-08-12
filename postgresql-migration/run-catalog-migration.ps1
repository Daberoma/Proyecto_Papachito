$ErrorActionPreference = 'Stop'

$php = 'C:\laragon\bin\php\php-7.2.19-Win32-VC15-x64\php.exe'
$psql = Get-ChildItem -LiteralPath 'C:\Program Files\PostgreSQL' -Recurse -Filter psql.exe -ErrorAction SilentlyContinue | Select-Object -First 1
if (-not (Test-Path -LiteralPath $php)) {
    throw "No se encontro PHP en $php"
}
if (-not $psql) {
    throw 'No se encontro psql.exe.'
}

$secure = Read-Host 'Contrasena de PostgreSQL para papachito_app' -AsSecureString
$ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
try {
    $plain = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    $env:PGPASSWORD = $plain
    $env:PAPACHITO_PG_PASSWORD = $plain

    & $psql.FullName -h 127.0.0.1 -p 5432 -U papachito_app -d papachito_app -v ON_ERROR_STOP=1 -f "$PSScriptRoot\sql\03-product-description.sql"
    & $php "$PSScriptRoot\migrate-catalog.php"
    & $psql.FullName -h 127.0.0.1 -p 5432 -U papachito_app -d papachito_app -c "SELECT COUNT(*) AS productos, COUNT(description) AS con_descripcion FROM products;"
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Remove-Item Env:PAPACHITO_PG_PASSWORD -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
}
