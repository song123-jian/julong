@echo off
call D:\RJBC\set-env.bat
echo === JAVA_HOME=%JAVA_HOME% ===
echo === ANDROID_HOME=%ANDROID_HOME% ===
cd /d D:\cx\JL\android
call D:\RJBC\env\gradle-8.14.3\bin\gradle.bat assembleRelease --no-daemon --console=plain
echo === GRADLE_EXIT_CODE=%ERRORLEVEL% ===
dir /b "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" 2>nul
