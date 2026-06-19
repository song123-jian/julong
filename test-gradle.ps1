$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:PATH = "d:\RJBC\env\jdk\bin;$env:PATH"
Write-Host "Java version:"
& "$env:JAVA_HOME\bin\java.exe" -version 2>&1
Write-Host "`nGradle tasks test:"
$proc = Start-Process -FilePath "D:\RJBC\env\gradle-8.14.3\bin\gradle.bat" `
    -ArgumentList "tasks","--no-daemon","--console=plain","--info" `
    -WorkingDirectory "D:\cx\JL\android" `
    -NoNewWindow -Wait -PassThru `
    -RedirectStandardOutput "D:\cx\JL\gradle-tasks-out.log" `
    -RedirectStandardError "D:\cx\JL\gradle-tasks-err.log"
Write-Host "Exit Code: $($proc.ExitCode)"
Write-Host "=== Out lines: $((Get-Content 'D:\cx\JL\gradle-tasks-out.log' -ErrorAction SilentlyContinue).Count) ==="
Write-Host "=== Err lines: $((Get-Content 'D:\cx\JL\gradle-tasks-err.log' -ErrorAction SilentlyContinue).Count) ==="
