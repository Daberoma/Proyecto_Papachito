$ErrorActionPreference = 'Stop'

try {
    $postgres = Get-Service -Name 'postgresql-x64-18' -ErrorAction Stop
    if ($postgres.Status -ne 'Running') {
        Start-Service -Name 'postgresql-x64-18' -ErrorAction Stop
        $postgres.WaitForStatus('Running', '00:00:15')
    }
    Set-Location -LiteralPath (Join-Path $PSScriptRoot 'backend-node')
    $node = Join-Path ${env:ProgramFiles} 'nodejs\node.exe'
    $ip = Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notmatch '^(127\.|169\.254\.)' } | Select-Object -First 1 -ExpandProperty IPAddress
    Write-Host ''
    Write-Host 'Escanea este QR desde el celular. La API quedara activa en esta ventana:' -ForegroundColor Green
    & $node 'print-qr.js' ("http://{0}:8090" -f $ip)
    Write-Host ''
    Write-Host 'Iniciando API en primer plano. Ctrl+C la detiene.' -ForegroundColor Yellow
    & $node 'server.js'
}
catch {
    Write-Host ''
    Write-Host ('ERROR: ' + $_.Exception.Message) -ForegroundColor Red
}
finally {
    Read-Host 'Presiona Enter para cerrar esta ventana'
}
