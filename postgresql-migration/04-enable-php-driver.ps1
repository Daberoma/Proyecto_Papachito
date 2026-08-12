$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Abre PowerShell como administrador y vuelve a ejecutar este archivo.'
}

$phpRoot = 'C:\laragon\bin\php\php-7.2.19-Win32-VC15-x64'
$phpIni = Join-Path $phpRoot 'php.ini'
foreach ($dll in @('php_pdo_pgsql.dll', 'php_pgsql.dll')) {
    if (-not (Test-Path -LiteralPath (Join-Path $phpRoot "ext\$dll"))) {
        throw "Falta $dll; no se modificó php.ini."
    }
}

$backup = "$phpIni.before-postgresql-$((Get-Date).ToString('yyyyMMdd-HHmmss')).bak"
Copy-Item -LiteralPath $phpIni -Destination $backup
$content = Get-Content -LiteralPath $phpIni -Raw
$content = $content -replace '(?m)^;extension=pdo_pgsql\s*$', 'extension=pdo_pgsql'
$content = $content -replace '(?m)^;extension=pgsql\s*$', 'extension=pgsql'
Set-Content -LiteralPath $phpIni -Value $content -Encoding UTF8

Write-Host "Controladores habilitados. Copia de seguridad: $backup"
Write-Host 'Reinicia Papachito Móvil para que PHP cargue los módulos.'

