@echo off
REM ============================================================
REM  USAMKO - Complete Lead Generation System Launcher
REM ============================================================

:menu
cls
echo ============================================================
echo   USAMKO - Complete Lead Generation System
echo ============================================================
echo.
echo   Choose what to launch:
echo.
echo   1. LinkedIn Lead Collector (Python)
echo   2. Linkout Email Finder (Next.js)
echo   3. USAMKO Social Platform (NestJS)
echo   4. Test Linkout
echo   5. Integration Script (LinkedIn + Linkout)
echo   6. Open Documentation
echo   7. Exit
echo.
echo ============================================================

set /p choice="Enter your choice (1-7): "

if "%choice%"=="1" goto linkedin
if "%choice%"=="2" goto linkout
if "%choice%"=="3" goto usamko
if "%choice%"=="4" goto test
if "%choice%"=="5" goto integrate
if "%choice%"=="6" goto docs
if "%choice%"=="7" goto end

echo Invalid choice. Press any key to try again...
pause >nul
goto menu

:linkedin
cls
echo ============================================================
echo   LinkedIn Lead Collector
echo ============================================================
echo.
echo   Choose script to run:
echo.
echo   1. Discover Companies
echo   2. Search Role at Company
echo   3. Search Role Anywhere
echo   4. Enrich Profile List
echo   5. Back to main menu
echo.
set /p script="Enter your choice (1-5): "

if "%script%"=="1" (
    cd "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
    echo.
    echo Starting discover_companies.py...
    echo.
    python discover_companies.py
    pause
    goto menu
)
if "%script%"=="2" (
    cd "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
    echo.
    echo Starting search_role_at_company.py...
    echo.
    python search_role_at_company.py
    pause
    goto menu
)
if "%script%"=="3" (
    cd "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
    echo.
    echo Starting search_role_anywhere.py...
    echo.
    python search_role_anywhere.py
    pause
    goto menu
)
if "%script%"=="4" (
    cd "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)"
    echo.
    echo Starting enrich_profile_list.py...
    echo.
    python enrich_profile_list.py
    pause
    goto menu
)
if "%script%"=="5" goto menu
goto linkedin

:linkout
cls
echo ============================================================
echo   Linkout Email Finder
echo ============================================================
echo.
echo   Starting Next.js dev server...
echo   Open: http://localhost:3000
echo.
echo   Press Ctrl+C to stop the server
echo ============================================================
echo.
cd m:\USAMKO\linkout
npm run dev
pause
goto menu

:usamko
cls
echo ============================================================
echo   USAMKO Social Platform
echo ============================================================
echo.
echo   Starting NestJS API server...
echo   API: http://localhost:3000
echo.
echo   Press Ctrl+C to stop the server
echo ============================================================
echo.
cd m:\USAMKO
npm run dev
pause
goto menu

:test
cls
echo ============================================================
echo   Testing Linkout
echo ============================================================
echo.
cd m:\USAMKO\linkout
node test-linkout.js
echo.
echo ============================================================
pause
goto menu

:integrate
cls
echo ============================================================
echo   Integration Script (LinkedIn + Linkout)
echo ============================================================
echo.
echo   This script reads LinkedIn profiles and finds emails.
echo.
echo   Usage:
echo     python integrate-with-linkedin-collector.py input.xlsx output.xlsx
echo.
echo   Example:
echo     python integrate-with-linkedin-collector.py role_at_company_2026-08-14.xlsx complete_leads.xlsx
echo.
echo ============================================================
echo.
set /p input="Enter input Excel file path: "
set /p output="Enter output Excel file path: "

cd m:\USAMKO\linkout
python integrate-with-linkedin-collector.py "%input%" "%output%"
echo.
pause
goto menu

:docs
cls
echo ============================================================
echo   Opening Documentation
echo ============================================================
echo.
echo   Available documentation:
echo.
echo   1. START HERE (Main guide)
echo   2. Complete Lead Generation System
echo   3. LinkedIn Collector Fixes
echo   4. Linkout README
echo   5. USAMKO Setup Guide
echo   6. Back to main menu
echo.
set /p doc="Enter your choice (1-6): "

if "%doc%"=="1" start "" "m:\USAMKO\START_HERE.md"
if "%doc%"=="2" start "" "m:\USAMKO\COMPLETE_LEAD_GENERATION_SYSTEM.md"
if "%doc%"=="3" start "" "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)\FIXES_AND_USAGE.md"
if "%doc%"=="4" start "" "m:\USAMKO\linkout\README.md"
if "%doc%"=="5" start "" "m:\USAMKO\COMPLETE_SETUP_GUIDE.md"
if "%doc%"=="6" goto menu

pause
goto menu

:end
cls
echo.
echo Thank you for using USAMKO!
echo.
echo For support, check the documentation in m:\USAMKO\
echo.
pause
exit
