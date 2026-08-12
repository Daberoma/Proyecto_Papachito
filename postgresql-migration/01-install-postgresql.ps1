$ErrorActionPreference = 'Stop'

$principal = New-Object Security.Principal.WindowsPrincipal([Security.Principal.WindowsIdentity]::GetCurrent())
if (-not $principal.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    throw 'Abre PowerShell como administrador y vuelve a ejecutar este archivo.'
}

$existing = Get-Service -ErrorAction SilentlyContinue | Where-Object {
    $_.Name -match '^postgresql' -or $_.DisplayName -match 'PostgreSQL'
}
if ($existing) {
    Write-Host 'PostgreSQL ya tiene un servicio instalado. No se instalará otra copia.'
    $existing | Format-Table Name, Status, StartType
    exit 0
}

Write-Host 'Se abrirá el instalador oficial de PostgreSQL 17.'
Write-Host 'Usa el puerto 5432 y guarda de forma segura la contraseña que elijas para postgres.'
winget install --id PostgreSQL.PostgreSQL.17 --exact --interactive --accept-source-agreements --accept-package-agreements

