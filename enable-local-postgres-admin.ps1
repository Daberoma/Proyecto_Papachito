$ErrorActionPreference = 'Stop'
$hba = 'C:\Program Files\PostgreSQL\18\data\pg_hba.conf'
$backup = "$hba.codex-local-backup"
try {
    Copy-Item -LiteralPath $hba -Destination $backup -Force
    $lines = Get-Content -LiteralPath $hba
    $updated = $lines | ForEach-Object {
        if ($_ -match '^\s*host\s+all\s+all\s+127\.0\.0\.1/32\s+') {
            $_ -replace '\S+\s*$', 'trust'
        } else { $_ }
    }
    Set-Content -LiteralPath $hba -Value $updated -Encoding ascii
    Restart-Service -Name 'postgresql-x64-18' -Force
    (Get-Service -Name 'postgresql-x64-18').WaitForStatus('Running', '00:00:20')
    Write-Host 'OK: PostgreSQL acepta conexiones locales de la API sin contraseña.' -ForegroundColor Green
} catch {
    if (Test-Path -LiteralPath $backup) { Copy-Item -LiteralPath $backup -Destination $hba -Force }
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
} finally {
    if (Test-Path -LiteralPath $backup) { Remove-Item -LiteralPath $backup -Force }
    Read-Host 'Presiona Enter para cerrar'
}
