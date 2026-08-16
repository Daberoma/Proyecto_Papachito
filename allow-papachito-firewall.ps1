#Requires -RunAsAdministrator
$ErrorActionPreference = 'Stop'
foreach ($entry in @(@{ Name = 'Papachito API 8090'; Port = 8090 }, @{ Name = 'Papachito Web 8091'; Port = 8091 })) {
  if (-not (Get-NetFirewallRule -DisplayName $entry.Name -ErrorAction SilentlyContinue)) {
    New-NetFirewallRule -DisplayName $entry.Name -Direction Inbound -Action Allow -Protocol TCP -LocalPort $entry.Port -Profile Private | Out-Null
  }
}
Write-Host 'Firewall preparado para Papachito (puertos 8090 y 8091).'
