@echo off
chcp 65001 >nul 2>&1
title USAMKO Lead Generation - Master Control
color 0A

:MENU
cls
echo.
echo ╔══════════════════════════════════════════════════════════════╗
echo ║                                                              ║
echo ║          USAMKO LEAD GENERATION - MASTER CONTROL            ║
echo ║                                                              ║
echo ║                  4 Tools - All Systems Ready                ║
echo ║                                                              ║
echo ╚══════════════════════════════════════════════════════════════╝
echo.
echo   QUICK ACTIONS:
echo   ─────────────────────────────────────────────────────────────
echo   1. LinkedIn - Discover Companies
echo   2. LinkedIn - Find People at Companies
echo   3. Linkout - Find Emails (Start Server)
echo   4. Google Maps - Open Extension Instructions
echo   5. Integration - LinkedIn + Linkout
echo.
echo   TESTING:
echo   ─────────────────────────────────────────────────────────────
echo   6. Test All Systems
echo   7. Build Linkout (Verify)
echo   8. Generate Extension Icons
echo.
echo   DOCUMENTATION:
echo   ─────────────────────────────────────────────────────────────
echo   9. Open Complete Guide (START_HERE.md)
echo   A. Open Master System Guide
echo   B. Open Google Maps Guide
echo   C. Open All Tools Summary
echo.
echo   D. Open Project Folder
echo   E. Open Chrome Extensions Page
echo.
echo   0. Exit
echo.
echo ══════════════════════════════════════════════════════════════
set /p choice="Enter your choice: "

if "%choice%"=="1" goto LINKEDIN_DISCOVER
if "%choice%"=="2" goto LINKEDIN_ROLES
if "%choice%"=="3" goto LINKOUT_START
if "%choice%"=="4" goto GOOGLE_MAPS
if "%choice%"=="5" goto INTEGRATION
if "%choice%"=="6" goto TEST_ALL
if "%choice%"=="7" goto BUILD_LINKOUT
if "%choice%"=="8" goto GEN_ICONS
if "%choice%"=="9" goto DOC_START
if /i "%choice%"=="A" goto DOC_MASTER
if /i "%choice%"=="B" goto DOC_MAPS
if /i "%choice%"=="C" goto DOC_SUMMARY
if /i "%choice%"=="D" goto OPEN_FOLDER
if /i "%choice%"=="E" goto OPEN_CHROME
if "%choice%"=="0" exit
goto MENU

:LINKEDIN_DISCOVER
cls
echo.
echo Starting LinkedIn Company Discovery...
echo.
cd /d "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
python discover_companies.py
pause
goto MENU

:LINKEDIN_ROLES
cls
echo.
echo Starting LinkedIn Role Search...
echo.
cd /d "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
python search_role_at_company.py
pause
goto MENU

:LINKOUT_START
cls
echo.
echo Starting Linkout Email Finder...
echo.
echo Server will start on http://localhost:3000
echo Press Ctrl+C to stop the server
echo.
cd /d "M:\USAMKO\linkout"
start http://localhost:3000/find
npm run dev
pause
goto MENU

:GOOGLE_MAPS
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo   GOOGLE MAPS LEAD COLLECTOR - SETUP
echo ═══════════════════════════════════════════════════════════
echo.
echo   STEP 1: Load Extension in Chrome
echo   ────────────────────────────────────────────────────────
echo   1. Press E to open chrome://extensions/
echo   2. Enable "Developer mode" (top-right toggle)
echo   3. Click "Load unpacked"
echo   4. Select: M:\USAMKO\chrome-extension
echo   5. Extension loaded!
echo.
echo   STEP 2: Use It
echo   ────────────────────────────────────────────────────────
echo   1. Go to: https://www.google.com/maps
echo   2. Search for businesses (e.g., "restaurants in Cairo")
echo   3. Extension automatically collects leads
echo   4. Click extension icon to export CSV
echo.
echo   Press M to open full guide
echo   Press E to open chrome://extensions/
echo   Press G to open Google Maps
echo   Press any other key to return to menu
echo.
set /p gchoice="Your choice: "
if /i "%gchoice%"=="M" start "" "M:\USAMKO\chrome-extension\GOOGLE_MAPS_LEAD_COLLECTOR.md"
if /i "%gchoice%"=="E" start chrome chrome://extensions/
if /i "%gchoice%"=="G" start chrome https://www.google.com/maps
goto MENU

:INTEGRATION
cls
echo.
echo Starting LinkedIn + Linkout Integration...
echo.
echo PREREQUISITES:
echo 1. Run LinkedIn collector first (option 1 or 2)
echo 2. Start Linkout server (option 3)
echo 3. Have Excel file from LinkedIn ready
echo.
pause
echo.
set /p excelfile="Enter path to LinkedIn Excel file: "
if not exist "%excelfile%" (
    echo Error: File not found!
    pause
    goto MENU
)
echo.
echo Processing...
cd /d "M:\USAMKO"
python integrate-with-linkedin-collector.py "%excelfile%"
pause
goto MENU

:TEST_ALL
cls
echo.
echo ═══════════════════════════════════════════════════════════
echo   TESTING ALL SYSTEMS
echo ═══════════════════════════════════════════════════════════
echo.
echo [1/4] Testing LinkedIn Collector...
cd /d "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
if exist "discover_companies.py" (
    echo   [OK] LinkedIn scripts found
) else (
    echo   [ERROR] LinkedIn scripts not found
)
echo.
echo [2/4] Testing Linkout...
cd /d "M:\USAMKO\linkout"
if exist "package.json" (
    echo   [OK] Linkout found
    echo   Building...
    call npm run build >nul 2>&1
    if %ERRORLEVEL%==0 (
        echo   [OK] Build successful
    ) else (
        echo   [ERROR] Build failed
    )
) else (
    echo   [ERROR] Linkout not found
)
echo.
echo [3/4] Testing Chrome Extension...
cd /d "M:\USAMKO\chrome-extension"
if exist "manifest.json" (
    echo   [OK] Extension manifest found
    if exist "icons\icon16.png" (
        echo   [OK] Extension icons found
    ) else (
        echo   [WARNING] Icons missing (run option 8 to generate)
    )
    if exist "content\google-maps.js" (
        echo   [OK] Google Maps collector found
    ) else (
        echo   [ERROR] Google Maps script missing
    )
) else (
    echo   [ERROR] Extension not found
)
echo.
echo [4/4] Testing Integration Script...
cd /d "M:\USAMKO"
if exist "integrate-with-linkedin-collector.py" (
    echo   [OK] Integration script found
) else (
    echo   [ERROR] Integration script missing
)
echo.
echo ═══════════════════════════════════════════════════════════
echo   TEST COMPLETE
echo ═══════════════════════════════════════════════════════════
pause
goto MENU

:BUILD_LINKOUT
cls
echo.
echo Building Linkout...
echo.
cd /d "M:\USAMKO\linkout"
call npm run build
echo.
echo Build complete!
pause
goto MENU

:GEN_ICONS
cls
echo.
echo Generating Extension Icons...
echo.
cd /d "M:\USAMKO"
python create-extension-icons.py
echo.
echo Icons generated in chrome-extension/icons/
pause
goto MENU

:DOC_START
start "" "M:\USAMKO\START_HERE.md"
goto MENU

:DOC_MASTER
start "" "M:\USAMKO\MASTER_LEAD_GENERATION_SYSTEM.md"
goto MENU

:DOC_MAPS
start "" "M:\USAMKO\chrome-extension\GOOGLE_MAPS_LEAD_COLLECTOR.md"
goto MENU

:DOC_SUMMARY
start "" "M:\USAMKO\ALL_TOOLS_SUMMARY.txt"
goto MENU

:OPEN_FOLDER
start "" "M:\USAMKO"
goto MENU

:OPEN_CHROME
start chrome chrome://extensions/
goto MENU
