$ErrorActionPreference = 'Stop'

$php = 'C:\laragon\bin\php\php-7.2.19-Win32-VC15-x64\php.exe'
if (-not (Test-Path -LiteralPath $php)) {
    throw "No se encontro PHP en $php"
}

if (-not $env:PAPACHITO_PG_PASSWORD) {
    $secure = Read-Host 'Contrasena del usuario PostgreSQL papachito_app' -AsSecureString
    $ptr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure)
    try {
        $env:PAPACHITO_PG_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($ptr)
    }
    finally {
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($ptr)
    }
}

$public = Join-Path $PSScriptRoot 'public'
$router = Join-Path $public 'api.php'
& $php -S 0.0.0.0:8090 -t $public $router
