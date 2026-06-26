$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$cargoBin = Join-Path $env:USERPROFILE '.cargo\bin'
$cargoExe = Join-Path $cargoBin 'cargo.exe'
$rustupExe = Join-Path $cargoBin 'rustup.exe'

if (-not (Test-Path $cargoExe)) {
  Write-Host 'cargo.exe not found in %USERPROFILE%\.cargo\bin'
  exit 1
}

$env:PATH = "$cargoBin;$env:PATH"

Push-Location $root
try {
  cmd /c npm run build
  cmd /c npx tauri build --no-bundle
} finally {
  Pop-Location
}
