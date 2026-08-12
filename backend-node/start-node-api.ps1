$ErrorActionPreference = 'Stop'

$nodeDir = 'C:\Program Files\nodejs'
$env:Path = "$nodeDir;$env:Path"

if (-not $env:PAPACHITO_PG_PASSWORD) {
    $secure = Read-Host 'Contrasena de PostgreSQL papachito_app' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $env:PAPACHITO_PG_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

Set-Location -LiteralPath $PSScriptRoot
& "$nodeDir\node.exe" server.js
