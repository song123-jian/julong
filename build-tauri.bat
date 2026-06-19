@echo off
call D:\RJBC\set-env.bat
set "CARGO_HOME=D:\cx\JL\.cargo"
set "RUSTUP_HOME=d:\RJBC\env\rust\rustup"
echo === CARGO_HOME=%CARGO_HOME% ===
cd /d D:\cx\JL
call npx tauri build --bundles nsis
echo === TAURI_EXIT_CODE=%ERRORLEVEL% ===
dir /b "D:\cx\JL\src-tauri\target\release\bundle\nsis\*.exe" 2>nul
dir /b "D:\cx\JL\src-tauri\target\release\*.exe" 2>nul
