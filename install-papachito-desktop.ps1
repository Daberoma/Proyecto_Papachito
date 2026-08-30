$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$desktop = [Environment]::GetFolderPath('Desktop')
$shell = New-Object -ComObject WScript.Shell
$icon = Join-Path $root 'mobile\icon.png'
$launcher = Join-Path $root 'start-papachito-console.cmd'
$shortcut = Join-Path $desktop 'Donde Papachito.lnk'
$link = $shell.CreateShortcut($shortcut)
$link.TargetPath = $launcher
$link.Arguments = ''
$link.WorkingDirectory = $root
$link.IconLocation = "$icon,0"
$link.Save()

$searchShortcut = Join-Path $desktop 'Buscar proyectos.lnk'
$searchLink = $shell.CreateShortcut($searchShortcut)
$searchLink.TargetPath = 'wscript.exe'
$searchLink.Arguments = "`"$(Join-Path $root 'project-search.vbs')`""
$searchLink.WorkingDirectory = $root
$searchLink.IconLocation = "$icon,0"
$searchLink.Save()

Write-Host "Accesos directos creados: $shortcut y $searchShortcut"
Write-Host 'Ahora se abre una ventana CMD de arranque y el sistema local; los procesos auxiliares quedan ocultos.'
