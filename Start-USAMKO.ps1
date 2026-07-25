# USAMKO Platform Launcher (PowerShell)
# Starts both the existing app and the AI Bridge service

Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  USAMKO Platform v1.0.0" -ForegroundColor Cyan
Write-Host "  AI-Powered Social Media Automation" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if .NET 8 SDK is available
$dotnetVersion = dotnet --version 2>$null
if (-not $dotnetVersion) {
    Write-Host "[WARNING] .NET SDK not found. AI features require .NET 8.0+" -ForegroundColor Yellow
    Write-Host "[INFO] Download from: https://dotnet.microsoft.com/download" -ForegroundColor Gray
} else {
    Write-Host "[OK] .NET SDK found: $dotnetVersion" -ForegroundColor Green

    # Start AI Bridge Service
    Write-Host "[1/2] Starting USAMKO AI Bridge Service..." -ForegroundColor White
    $aiProcess = Start-Process -FilePath "dotnet" -ArgumentList "run --project src\USAMKO.AI.Bridge\USAMKO.AI.Bridge.csproj" -PassThru -WindowStyle Minimized
    Write-Host "[OK] AI Bridge starting on http://localhost:5100" -ForegroundColor Green

    # Wait for AI service
    Start-Sleep -Seconds 3
}

# Start existing application
Write-Host "[2/2] Starting USAMKO main application..." -ForegroundColor White
$mainProcess = Start-Process -FilePath ".\Sender Pro.exe" -PassThru
Write-Host "[OK] USAMKO main application started (PID: $($mainProcess.Id))" -ForegroundColor Green

Write-Host ""
Write-Host "===================================" -ForegroundColor Cyan
Write-Host "  Both services running." -ForegroundColor Green
Write-Host "  AI Health: http://localhost:5100/api/ai/health" -ForegroundColor Gray
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop AI service..." -ForegroundColor Gray

# Wait for main app to close
if ($mainProcess) {
    $mainProcess.WaitForExit()
}

# Cleanup AI service when main app closes
if ($aiProcess -and -not $aiProcess.HasExited) {
    Write-Host "Stopping AI Bridge Service..." -ForegroundColor Yellow
    Stop-Process -Id $aiProcess.Id -Force
}

Write-Host "USAMKO shutdown complete." -ForegroundColor Green
