#Requires -RunAsAdministrator
<#
.SYNOPSIS
    Sets up Android SDK for Mailman Capacitor APK builds.
.DESCRIPTION
    Downloads command-line tools, accepts licenses, installs required SDK packages.
    Run once before building the APK. Requires Java 17+ (you have Java 21 ✓).
.USAGE
    .\setup-android-sdk.ps1
#>

$ErrorActionPreference = "Stop"
$SdkDir = "$env:LOCALAPPDATA\Android\Sdk"
$CmdToolsZip = "$env:TEMP\commandlinetools.zip"
$CmdToolsUrl = "https://dl.google.com/android/repository/commandlinetools-win-11076708_latest.zip"

Write-Host "📱 Mailman Android SDK Setup" -ForegroundColor Cyan
Write-Host ""

# Step 1: Create SDK directory
if (!(Test-Path $SdkDir)) {
    New-Item -ItemType Directory -Path $SdkDir -Force | Out-Null
    Write-Host "✅ Created SDK directory: $SdkDir"
}

# Step 2: Download command-line tools
if (!(Test-Path "$SdkDir\cmdline-tools\latest\bin\sdkmanager.bat")) {
    Write-Host "⬇️  Downloading Android command-line tools..." -ForegroundColor Yellow
    # Use BITS for faster, resumable downloads
    if (Get-Command Start-BitsTransfer -ErrorAction SilentlyContinue) {
        Start-BitsTransfer -Source $CmdToolsUrl -Destination $CmdToolsZip
    } else {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
        (New-Object System.Net.WebClient).DownloadFile($CmdToolsUrl, $CmdToolsZip)
    }

    Write-Host "📦 Extracting..." -ForegroundColor Yellow
    Expand-Archive -Path $CmdToolsZip -DestinationPath "$SdkDir\cmdline-tools-temp" -Force
    if (!(Test-Path "$SdkDir\cmdline-tools\latest")) {
        New-Item -ItemType Directory -Path "$SdkDir\cmdline-tools\latest" -Force | Out-Null
    }
    Move-Item "$SdkDir\cmdline-tools-temp\cmdline-tools\*" "$SdkDir\cmdline-tools\latest\" -Force
    Remove-Item "$SdkDir\cmdline-tools-temp" -Recurse -Force
    Remove-Item $CmdToolsZip -Force
    Write-Host "✅ Command-line tools installed"
} else {
    Write-Host "✅ Command-line tools already installed"
}

# Set ANDROID_HOME for this session
$env:ANDROID_HOME = $SdkDir
$env:PATH = "$SdkDir\cmdline-tools\latest\bin;$SdkDir\platform-tools;$env:PATH"

# Persist environment variables
[Environment]::SetEnvironmentVariable("ANDROID_HOME", $SdkDir, "User")

# Step 3: Accept licenses
Write-Host "📜 Accepting Android SDK licenses..." -ForegroundColor Yellow
"y" * 10 | & "$SdkDir\cmdline-tools\latest\bin\sdkmanager.bat" --licenses 2>&1 | Out-Null
Write-Host "✅ Licenses accepted"

# Step 4: Install required SDK packages
Write-Host "📥 Installing SDK packages (this may take a few minutes)..." -ForegroundColor Yellow
$packages = @(
    "platforms;android-34",
    "build-tools;34.0.0",
    "platform-tools"
)
& "$SdkDir\cmdline-tools\latest\bin\sdkmanager.bat" $packages 2>&1 | ForEach-Object {
    if ($_ -match "^\[.*\]") { Write-Host $_ }
}
Write-Host "✅ SDK packages installed"

# Step 5: Verify
Write-Host ""
Write-Host "🎉 Android SDK setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Environment:"
Write-Host "  ANDROID_HOME = $SdkDir"
Write-Host "  Java = $(java -version 2>&1 | Select-Object -First 1)"
Write-Host ""
Write-Host "To build the APK, run:" -ForegroundColor Cyan
Write-Host "  cd E:\Mailman"
Write-Host "  npm run build --workspace=client"
Write-Host "  npx cap sync android"
Write-Host "  cd android"
Write-Host "  .\gradlew assembleRelease"
Write-Host ""
Write-Host "APK will be at: android\app\build\outputs\apk\release\app-release.apk"

</ARG>