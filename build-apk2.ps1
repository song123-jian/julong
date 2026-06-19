$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:ANDROID_SDK_ROOT = "d:\RJBC\env\android-sdk"
$env:PATH = "d:\RJBC\env\jdk\bin;d:\RJBC\env\android-sdk\platform-tools;$env:PATH"
Set-Location D:\cx\JL\android
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = "D:\RJBC\env\gradle-8.14.3\bin\gradle.bat"
$psi.Arguments = "assembleRelease --no-daemon --console=plain --stacktrace"
$psi.RedirectStandardOutput = $true
$psi.RedirectStandardError = $true
$psi.UseShellExecute = $false
$psi.CreateNoWindow = $true
$proc = [System.Diagnostics.Process]::Start($psi)
$out = $proc.StandardOutput.ReadToEnd()
$err = $proc.StandardError.ReadToEnd()
$proc.WaitForExit()
$out | Out-File -FilePath "D:\cx\JL\build-apk-stdout.log" -Encoding utf8
$err | Out-File -FilePath "D:\cx\JL\build-apk-stderr.log" -Encoding utf8
Write-Host "ExitCode: $($proc.ExitCode)"
Write-Host "Stdout lines: $((Get-Content 'D:\cx\JL\build-apk-stdout.log').Count)"
Write-Host "Stderr lines: $((Get-Content 'D:\cx\JL\build-apk-stderr.log').Count)"
Get-ChildItem "D:\cx\JL\android\app\build\outputs\apk\release\*.apk" -ErrorAction SilentlyContinue | Select-Object Name, Length
