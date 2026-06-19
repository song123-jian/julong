$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:ANDROID_SDK_ROOT = "d:\RJBC\env\android-sdk"
$env:PATH = "d:\RJBC\env\jdk\bin;d:\RJBC\env\android-sdk\platform-tools;$env:PATH"
$env:GRADLE_OPTS = "-Dorg.gradle.daemon=false"

Write-Host "Starting Gradle build..."
$proc = Start-Process -FilePath "D:\RJBC\env\gradle-8.14.3\bin\gradle.bat" `
    -ArgumentList "assembleRelease","--no-daemon","--console=plain","--stacktrace" `
    -WorkingDirectory "D:\cx\JL\android" `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput "D:\cx\JL\gradle-out.log" `
    -RedirectStandardError "D:\cx\JL\gradle-err.log"

Write-Host "Gradle Exit Code: $($proc.ExitCode)"
Write-Host "=== Stdout (last 30 lines) ==="
if (Test-Path "D:\cx\JL\gradle-out.log") {
    Get-Content "D:\cx\JL\gradle-out.log" -Tail 30
}
Write-Host "=== Stderr (last 30 lines) ==="
if (Test-Path "D:\cx\JL\gradle-err.log") {
    Get-Content "D:\cx\JL\gradle-err.log" -Tail 30
}
Write-Host "=== APK Check ==="
Get-ChildItem "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" -ErrorAction SilentlyContinue | Select-Object Name, Length, FullName
