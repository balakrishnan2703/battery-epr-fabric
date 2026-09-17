# PowerShell Launcher for Battery EPR Verification System
$toolsPath = Join-Path $PSScriptRoot "tools\node"
$env:PATH = "$toolsPath;$env:PATH"
Set-Location $PSScriptRoot
Write-Host "======================================================================" -ForegroundColor Green
Write-Host "Starting Battery EPR Verification System (Hyperledger Fabric)" -ForegroundColor Cyan
Write-Host "======================================================================" -ForegroundColor Green
node start-all.js
