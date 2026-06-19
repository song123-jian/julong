$env:RUSTUP_HOME = "d:\RJBC\env\rust\rustup"
$env:CARGO_HOME = "d:\RJBC\env\rust\cargo"
$env:PATH = "d:\RJBC\env\rust\cargo\bin;d:\RJBC\env\node;$env:PATH"
$env:CARGO_BUILD_JOBS = "1"
$env:RUST_BACKTRACE = "1"
Set-Location D:\cx\JL\src-tauri
Write-Host "Starting cargo build..."
& "d:\RJBC\env\rust\cargo\bin\cargo.exe" build --release 2>&1 | Tee-Object -FilePath "D:\cx\JL\cargo-build.log"
Write-Host "Exit code: $LASTEXITCODE"
