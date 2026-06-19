Start-Transcript -Path "D:\cx\JL\build-apk4.log" -Force
$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:ANDROID_SDK_ROOT = "d:\RJBC\env\android-sdk"
$env:PATH = "d:\RJBC\env\jdk\bin;d:\RJBC\env\android-sdk\platform-tools;$env:PATH"
Write-Host "=== JAVA_HOME=$env:JAVA_HOME ==="
Write-Host "=== ANDROID_HOME=$env:ANDROID_HOME ==="
Write-Host "=== Gradle Version ==="
& "D:\RJBC\env\gradle-8.14.3\bin\gradle.bat" --version
Write-Host "=== Starting Build ==="
Set-Location D:\cx\JL\android
& "D:\RJBC\env\gradle-8.14.3\bin\gradle.bat" assembleRelease --no-daemon --console=plain --stacktrace
$exitCode = $LASTEXITCODE
Write-Host "=== GRADLE_EXIT_CODE=$exitCode ==="
Write-Host "=== Checking APK ==="
Get-ChildItem "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" -ErrorAction SilentlyContinue | Format-List Name, FullName, Length
Stop-Transcript
