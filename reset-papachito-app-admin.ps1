$ErrorActionPreference = 'Stop'
$hba = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$backup = "$hba.codex-backup"
$psql = 'C:\Program Files\PostgreSQL\18\bin\psql.exe'
# Password chosen for the local application role; kept as character codes so it is not printed in logs.
$password = -join (80,97,112,97,99,104,105,116,111,65,112,112,50,48,50,54,33 | ForEach-Object { [char]$_ })
$restored = $false
try {
    Copy-Item -LiteralPath $hba -Destination $backup -Force
    $lines = Get-Content -LiteralPath $hba
    $updated = $lines | ForEach-Object {
        if ($_ -match '^\s*(local\s+all\s+all|host\s+all\s+all\s+127\.0\.0\.1/32|host\s+all\s+all\s+::1/128)\s+') {
            $_ -replace 'scram-sha-256\s*$', 'trust'
        } else { $_ }
    }
    Set-Content -LiteralPath $hba -Value $updated -Encoding ascii
    Restart-Service -Name 'postgresql-x64-18' -Force
    (Get-Service -Name 'postgresql-x64-18').WaitForStatus('Running', '00:00:20')

    & $psql -h 127.0.0.1 -p 5432 -U postgres -d postgres -w -v ON_ERROR_STOP=1 -c "ALTER ROLE papachito_app WITH PASSWORD '$password';"
    if ($LASTEXITCODE -ne 0) { throw 'No se pudo actualizar la contraseña del usuario papachito_app.' }

    Copy-Item -LiteralPath $backup -Destination $hba -Force
    $restored = $true
    Remove-Item -LiteralPath $backup -Force
    Restart-Service -Name 'postgresql-x64-18' -Force
    (Get-Service -Name 'postgresql-x64-18').WaitForStatus('Running', '00:00:20')

    $env:PGPASSWORD = $password
    $count = & $psql -h 127.0.0.1 -p 5432 -U papachito_app -d papachito_app -w -tAc 'SELECT COUNT(*) FROM products;'
    if ($LASTEXITCODE -ne 0) { throw 'La contraseña se cambio, pero la prueba de productos fallo.' }
    [Environment]::SetEnvironmentVariable('PAPACHITO_PG_PASSWORD', $password, 'User')
    Write-Host "OK: contraseña de papachito_app actualizada. Productos: $($count.Trim())" -ForegroundColor Green
}
catch {
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
    if (-not $restored -and (Test-Path -LiteralPath $backup)) {
        Copy-Item -LiteralPath $backup -Destination $hba -Force
        Restart-Service -Name 'postgresql-x64-18' -Force
    }
}
finally {
    Remove-Item Env:PGPASSWORD -ErrorAction SilentlyContinue
    Read-Host 'Presiona Enter para cerrar'
}
