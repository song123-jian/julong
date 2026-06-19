$env:RUSTUP_HOME = "d:\RJBC\env\rust\rustup"
$env:CARGO_HOME = "D:\cx\JL\.cargo"
$env:RUSTUP_DIST_SERVER = "https://mirrors.tuna.tsinghua.edu.cn/rustup"
$env:PATH = "d:\RJBC\env\rust\cargo\bin;d:\RJBC\env\node;$env:PATH"
$env:CARGO_BUILD_JOBS = "1"
$env:RUST_BACKTRACE = "1"
New-Item -ItemType Directory -Path $env:CARGO_HOME -Force | Out-Null
Write-Host "=== CARGO_HOME=$env:CARGO_HOME ==="
Write-Host "=== CARGO_BUILD_JOBS=$env:CARGO_BUILD_JOBS ==="
Write-Host "=== Cleaning target ==="
Remove-Item "D:\cx\JL\src-tauri\target" -Recurse -Force -ErrorAction SilentlyContinue
Set-Location D:\cx\JL
Write-Host "=== Starting Tauri Build ==="
& npx tauri build --bundles nsis 2>&1 | Out-File -FilePath D:\cx\JL\build-tauri6.log -Encoding utf8
Write-Host "=== TAURI_EXIT_CODE=$LASTEXITCODE ==="
Write-Host "=== Checking NSIS ==="
Get-ChildItem "D:\cx\JL\src-tauri\target\release\bundle\nsis\*.exe" -ErrorAction SilentlyContinue | Select-Object Name, Length
Write-Host "=== Checking portable exe ==="
Get-ChildItem "D:\cx\JL\src-tauri\target\release\*.exe" -ErrorAction SilentlyContinue | Select-Object Name, Length
