@echo off
set JAVA_HOME=d:\RJBC\env\jdk
set ANDROID_HOME=d:\RJBC\env\android-sdk
set ANDROID_SDK_ROOT=d:\RJBC\env\android-sdk
set PATH=%JAVA_HOME%\bin;%ANDROID_HOME%\platform-tools;%PATH%
cd /d D:\cx\JL\android
call D:\RJBC\env\gradle-8.14.3\bin\gradle.bat assembleRelease --no-daemon --console=plain > D:\cx\JL\apk-output.log 2>&1
echo EXIT_CODE=%ERRORLEVEL% >> D:\cx\JL\apk-output.log
dir "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" >> D:\cx\JL\apk-output.log 2>&1
