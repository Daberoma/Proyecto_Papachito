$ErrorActionPreference = 'Stop'
$hba = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$backup = "$hba.codex-password-backup"
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
$password = -join (80,97,99,104,97,80,111,115,116,103,114,101,115,115,50,48,50,54,33 | ForEach-Object { [char]$_ })
$restored = $false
try {
    Copy-Item -LiteralPath $hba -Destination $backup -Force
    $updated = Get-Content -LiteralPath $hba | ForEach-Object {
        if ($_ -match '^\s*host\s+all\s+all\s+127\.0\.0\.1/32\s+') { $_ -replace '\S+\s*$', 'trust' }
        else { $_ }
    }
    Set-Content -LiteralPath $hba -Value $updated -Encoding ascii
    Restart-Service -Name 'postgresql-x64-18' -Force
    (Get-Service -Name 'postgresql-x64-18').WaitForStatus('Running', '00:00:20')
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -c "ALTER ROLE postgres WITH PASSWORD '$password';"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo cambiar la contraseña de postgres.' }
    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='papachito_app') THEN CREATE ROLE papachito_app LOGIN PASSWORD '$password'; ELSE ALTER ROLE papachito_app WITH PASSWORD '$password'; END IF; END `$`$;"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo preparar el usuario papachito_app.' }
    Copy-Item -LiteralPath $backup -Destination $hba -Force
    $restored = $true
    Remove-Item -LiteralPath $backup -Force
    Restart-Service -Name 'postgresql-x64-18' -Force
    (Get-Service -Name 'postgresql-x64-18').WaitForStatus('Running', '00:00:20')
    $env:PGPASSWORD = $password
    $result = & $psql -h 127.0.0.1 -p 5432 -U papachito_app -d papachito_app -w -tAc 'SELECT COUNT(*) FROM products;'
    if ($LASTEXITCODE -ne 0) { throw 'La contraseña se cambió, pero la prueba de productos falló.' }
    [Environment]::SetEnvironmentVariable('PAPACHITO_PG_PASSWORD', $password, 'User')
    Write-Host "OK: contraseña restablecida. Productos disponibles: $($result.Trim())" -ForegroundColor Green
    Write-Host 'Nueva contraseña: PachaPostgress2026!' -ForegroundColor Yellow
} catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    if (-not $restored -and (Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $backup -Destination $hba -Force
        Restart-Service -Name 'postgresql-x64-18' -Force
    }
} finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Read-Host 'Presiona Enter para cerrar'
}
