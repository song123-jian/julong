@echo off
set RUSTUP_HOME=d:\RJBC\env\rust\rustup
set CARGO_HOME=d:\RJBC\env\rust\cargo
set PATH=d:\RJBC\env\rust\cargo\bin;%PATH%
set CARGO_BUILD_JOBS=1
cd /d D:\cx\JL\src-tauri
call cargo build --release > D:\cx\JL\cargo-output.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> D:\cx\JL\cargo-output.log
dir "D:\cx\JL\src-tauri\target\release\*.exe" >> D:\cx\JL\cargo-output.log 2>&1
