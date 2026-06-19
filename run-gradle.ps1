$env:JAVA_HOME = "d:\RJBC\env\jdk"
$env:ANDROID_HOME = "d:\RJBC\env\android-sdk"
$env:ANDROID_SDK_ROOT = "d:\RJBC\env\android-sdk"
$env:PATH = "$env:JAVA_HOME\bin;$env:PATH"
Set-Location D:\cx\JL\android
& "d:\RJBC\env\jdk\bin\java.exe" -cp "D:\RJBC\env\gradle-8.14.3\lib\gradle-launcher-8.14.3.jar" org.gradle.launcher.GradleMain assembleRelease --no-daemon --console=plain
