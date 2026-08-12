$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$secretDir = Join-Path $root '.secrets'
$secretFile = Join-Path $secretDir 'pg-password.xml'
New-Item -ItemType Directory -Force -Path $secretDir | Out-Null
$secure = Read-Host 'Contrasena PostgreSQL de papachito_app (se guarda cifrada para tu usuario de Windows)' -AsSecureString
$secure | Export-Clixml -LiteralPath $secretFile
$taskName = 'Papachito Independiente'
$action = New-ScheduledTaskAction -Execute 'powershell.exe' -Argument "-NoProfile -ExecutionPolicy Bypass -File `"$root\start-papachito-console.ps1`""
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $env:USERNAME
$principal = New-ScheduledTaskPrincipal -UserId $env:USERNAME -LogonType Interactive -RunLevel Limited
Register-ScheduledTask -TaskName $taskName -Action $action -Trigger $trigger -Principal $principal -Force | Out-Null
Write-Host "Listo: Papachito se iniciara automaticamente al entrar a Windows."
Write-Host "Si Windows rechaza la tarea, vuelve a ejecutar este script como administrador."
