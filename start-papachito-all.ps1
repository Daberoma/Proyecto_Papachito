$ErrorActionPreference = 'Stop'
$root = $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
$pgData = 'C:\Program Files\PostgreSQL\18\data'

function Test-Port([int] $port) { return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue) }
function Wait-Port([int] $port, [int] $seconds = 30) {
  for ($i = 0; $i -lt $seconds; $i++) { if (Test-Port $port) { return $true }; Start-Sleep -Seconds 1 }
  return $false
}
function Wait-Http([string] $url, [int] $seconds = 30) {
  for ($i = 0; $i -lt $seconds; $i++) {
    try { $r = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2; if ($r.StatusCode -ge 200 -and $r.StatusCode -lt 500) { return $true } } catch { }
    Start-Sleep -Seconds 1
  }
  return $false
}
function Stop-Tree([int] $processId) { if ($processId -gt 0) { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null } }
function Listening-Pid([int] $port) {
  $connection = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1
  return if ($connection) { [int]$connection.OwningProcess } else { 0 }
}

try {
  if (-not (Test-Path -LiteralPath $node)) { $node = (Get-Command node.exe -ErrorAction Stop).Source }
  $password = [Environment]::GetEnvironmentVariable('PAPACHITO_PG_PASSWORD', 'User')
  if (-not $password) { throw 'Falta la contraseña de PostgreSQL configurada para tu usuario de Windows.' }

  $postmasterPidFile = Join-Path $pgData 'postmaster.pid'
  if (-not (Test-Port 5432) -and (Test-Path -LiteralPath $postmasterPidFile)) {
    $stalePid = 0
    [int]::TryParse((Get-Content -LiteralPath $postmasterPidFile -TotalCount 1 -ErrorAction SilentlyContinue), [ref]$stalePid) | Out-Null
    $staleProcess = if ($stalePid -gt 0) { Get-Process -Id $stalePid -ErrorAction SilentlyContinue } else { $null }
    if (-not $staleProcess) { Remove-Item -LiteralPath $postmasterPidFile -Force -ErrorAction Stop }
  }

  if (-not (Test-Port 5432) -and (Test-Path -LiteralPath $pgCtl) -and (Test-Path -LiteralPath $pgData)) {
    $pgLog = Join-Path $root 'postgres-start.log'
    $pgArgs = "start -D `"$pgData`" -w -l `"$pgLog`""
    Start-Process -FilePath $pgCtl -ArgumentList $pgArgs -WorkingDirectory (Split-Path -Parent $pgCtl) -WindowStyle Hidden | Out-Null
  }
  if (-not (Wait-Port 5432)) { throw 'PostgreSQL no está disponible en el puerto 5432.' }

  $env:PAPACHITO_PG_PASSWORD = $password
  if ((Test-Port 8090) -and -not (Wait-Http 'http://127.0.0.1:8090/api/salud' 3)) {
    Stop-Tree (Listening-Pid 8090)
  }
  if (-not (Test-Port 8090)) {
    $api = Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $root 'backend-node') -WindowStyle Hidden -PassThru
  }
  if ((Test-Port 8091) -and -not (Wait-Http 'http://127.0.0.1:8091/' 3)) {
    Stop-Tree (Listening-Pid 8091)
  }
  if (-not (Test-Port 8091)) {
    $web = Start-Process -FilePath $node -ArgumentList 'preview-server.js' -WorkingDirectory (Join-Path $root 'backend-node') -WindowStyle Hidden -PassThru
  }
  if (-not (Wait-Http 'http://127.0.0.1:8090/api/salud')) { throw 'La API no respondió en el puerto 8090.' }
  if (-not (Wait-Http 'http://127.0.0.1:8091/')) { throw 'La web no respondió en el puerto 8091.' }

  & (Join-Path $root 'desktop-connector\start-web-connector.ps1')
}
finally {
  # Los servicios quedan activos para que el celular pueda sincronizarse
  # después de cerrar la ventana auxiliar o la consola de prueba.
}
