$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$exePath = Join-Path $root 'src-tauri\target\release\julong.exe'
$portableDir = Join-Path $root 'release\windows-portable'
$zipPath = Join-Path $root 'release\julong-windows-portable.zip'
$readmePath = Join-Path $portableDir 'README.txt'
$portableExePath = Join-Path $portableDir 'julong.exe'

if (-not (Test-Path $exePath)) {
  Write-Host 'Portable EXE not found. Run npm run build:exe:portable first.'
  exit 1
}

if (Test-Path $portableDir) {
  Remove-Item -LiteralPath $portableDir -Recurse -Force
}

New-Item -ItemType Directory -Path $portableDir | Out-Null
Copy-Item -LiteralPath $exePath -Destination $portableExePath

$readmeLines = @(
  'Julong Windows Portable',
  '',
  'Usage:',
  '1. Double-click julong.exe',
  '2. If WebView is missing, install it when Windows prompts you',
  '',
  'Notes:',
  '- This is a portable build with no installer',
  '- User data stays in the current Windows user profile'
)

Set-Content -LiteralPath $readmePath -Value $readmeLines -Encoding UTF8

if (Test-Path $zipPath) {
  Remove-Item -LiteralPath $zipPath -Force
}

Compress-Archive -Path (Join-Path $portableDir '*') -DestinationPath $zipPath

Write-Host "Portable dir: $portableDir"
Write-Host "Portable zip: $zipPath"
