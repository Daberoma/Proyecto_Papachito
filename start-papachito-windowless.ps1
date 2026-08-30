$ErrorActionPreference = 'Stop'

$root = $PSScriptRoot
$node = 'C:\Program Files\nodejs\node.exe'
$pgCtl = 'C:\Program Files\PostgreSQL\18\bin\pg_ctl.exe'
$pgData = 'C:\Program Files\PostgreSQL\18\data'
$started = @()

function Test-Port([int] $port) {
    return [bool](Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
}

function Wait-Http([string] $url, [int] $seconds = 45) {
    for ($i = 0; $i -lt $seconds; $i++) {
        try {
            $response = Invoke-WebRequest -UseBasicParsing -Uri $url -TimeoutSec 2
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 500) { return $true }
        } catch { }
        Start-Sleep -Seconds 1
    }
    return $false
}

function Stop-Tree([int] $processId) {
    if ($processId -gt 0) { & taskkill.exe /PID $processId /T /F 2>$null | Out-Null }
}

try {
    $password = [Environment]::GetEnvironmentVariable('PAPACHITO_PG_PASSWORD', 'User')
    $secretFile = Join-Path $root '.secrets\pg-password.xml'
    if (-not $password -and (Test-Path -LiteralPath $secretFile)) {
        $secure = Import-Clixml -LiteralPath $secretFile
        $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
        try { $password = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr) }
        finally { [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr) }
    }
    if (-not $password) { throw 'No hay contraseña configurada para PostgreSQL papachito_app.' }

    if (-not (Test-Port 5432) -and (Test-Path -LiteralPath $pgCtl) -and (Test-Path -LiteralPath $pgData)) {
        & $pgCtl start -D $pgData -w -l (Join-Path $root 'postgres-start.log') | Out-Null
    }
    if (-not (Test-Port 5432)) { throw 'PostgreSQL no pudo iniciar en el puerto 5432.' }

    $env:PAPACHITO_PG_PASSWORD = $password
    if (-not (Test-Port 8090)) {
        $api = Start-Process -FilePath $node -ArgumentList 'server.js' -WorkingDirectory (Join-Path $root 'backend-node') -WindowStyle Hidden -PassThru
        $started += $api.Id
    }

    if (-not (Test-Port 8091)) {
        $web = Start-Process -FilePath $node -ArgumentList 'preview-server.js' -WorkingDirectory (Join-Path $root 'backend-node') -WindowStyle Hidden -PassThru
        $started += $web.Id
    }
    if (-not (Wait-Http 'http://127.0.0.1:8090/api/salud' 30)) { throw 'La API de Papachito no respondió.' }
    if (-not (Wait-Http 'http://127.0.0.1:8091/' 30)) { throw 'La ventana web de Papachito no respondió.' }

    $browserCandidates = @(
        (Join-Path ${env:ProgramFiles(x86)} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:ProgramFiles} 'Microsoft\Edge\Application\msedge.exe'),
        (Join-Path ${env:ProgramFiles} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:LOCALAPPDATA} 'Google\Chrome\Application\chrome.exe'),
        (Join-Path ${env:ProgramFiles} 'BraveSoftware\Brave-Browser\Application\brave.exe'),
        (Join-Path ${env:LOCALAPPDATA} 'BraveSoftware\Brave-Browser\Application\brave.exe'),
        (Join-Path ${env:ProgramFiles} 'Mozilla Firefox\firefox.exe')
    ) | Where-Object { $_ -and (Test-Path -LiteralPath $_) }

    if ($browserCandidates) {
        $profileDir = Join-Path $env:TEMP 'Papachito-app-window'
        $browser = Start-Process -FilePath $browserCandidates[0] -ArgumentList @('--app=http://127.0.0.1:8091/','--new-window',"--user-data-dir=$profileDir") -PassThru
        $browser.WaitForExit()
    } else {
        Start-Process 'http://127.0.0.1:8091/'
        Write-Host 'Papachito está disponible en http://127.0.0.1:8091/'
        Read-Host 'Presiona ENTER cuando termines para cerrar los servicios'
    }
} finally {
    foreach ($processId in $started) { Stop-Tree ([int]$processId) }
}
