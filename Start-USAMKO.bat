@echo off
title USAMKO Platform Launcher
echo ===================================
echo   USAMKO Platform v1.0.0
echo   AI-Powered Social Media Automation
echo ===================================
echo.

:: Start AI Bridge Service in background
echo [1/2] Starting USAMKO AI Bridge Service...
start /B "USAMKO AI Bridge" dotnet run --project src\USAMKO.AI.Bridge\USAMKO.AI.Bridge.csproj --no-build 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [WARNING] AI Bridge could not start. AI features will be unavailable.
    echo [WARNING] Run 'dotnet build src\USAMKO.AI.Bridge' first.
) else (
    echo [OK] AI Bridge starting on http://localhost:5100
)

:: Wait a moment for AI service to initialize
timeout /t 2 /nobreak >nul

:: Start existing application
echo [2/2] Starting USAMKO main application...
start "" "Sender Pro.exe"
echo [OK] USAMKO main application started.

echo.
echo ===================================
echo   Both services are running.
echo   AI Service: http://localhost:5100/api/ai/health
echo   Close this window to stop AI service.
echo ===================================
echo.

:: Keep this window open so AI service stays alive
pause
