$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:ANDROID_SDK_ROOT = "d:\RJBC\env\android-sdk"
$env:PATH = "d:\RJBC\env\jdk\bin;d:\RJBC\env\android-sdk\platform-tools;$env:PATH"
$env:GRADLE_HOME = "D:\RJBC\env\gradle-8.14.3"

Write-Host "=== Starting Gradle via Java directly ==="
Set-Location D:\cx\JL\android

$gradleJar = "D:\RJBC\env\gradle-8.14.3\lib\gradle-launcher-8.14.3.jar"
$javaExe = "$env:JAVA_HOME\bin\java.exe"

Write-Host "Java: $javaExe"
Write-Host "Gradle JAR: $gradleJar"
Write-Host "Working dir: $(Get-Location)"

& $javaExe -cp $gradleJar org.gradle.launcher.GradleMain assembleRelease --no-daemon --console=plain --stacktrace 2>&1 | Out-File -FilePath "D:\cx\JL\build-apk-direct.log" -Encoding utf8

Write-Host "=== Exit Code: $LASTEXITCODE ==="
Write-Host "=== Log size: $((Get-Item 'D:\cx\JL\build-apk-direct.log').Length) ==="
Write-Host "=== Last 20 lines ==="
Get-Content "D:\cx\JL\build-apk-direct.log" -Tail 20
Write-Host "=== APK Check ==="
Get-ChildItem "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" -ErrorAction SilentlyContinue | Select-Object Name, Length, FullName
