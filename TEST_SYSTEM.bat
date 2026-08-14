@echo off
chcp 65001 >nul 2>&1
title USAMKO - System Test
color 0B

echo.
echo ══════════════════════════════════════════════════════════
echo   USAMKO LEAD GENERATION - SYSTEM TEST
echo ══════════════════════════════════════════════════════════
echo.
echo   Testing all 4 systems...
echo.

REM Test 1: Extension Icons
echo [1/8] Checking Extension Icons...
if exist "m:\USAMKO\chrome-extension\icons\icon16.png" (
    echo   [OK] icon16.png found
) else (
    echo   [MISSING] Generating icons...
    cd /d "m:\USAMKO"
    python create-extension-icons.py >nul 2>&1
    if exist "m:\USAMKO\chrome-extension\icons\icon16.png" (
        echo   [OK] Icons generated successfully
    ) else (
        echo   [ERROR] Failed to generate icons
    )
)

REM Test 2: Extension Manifest
echo.
echo [2/8] Checking Chrome Extension...
if exist "m:\USAMKO\chrome-extension\manifest.json" (
    echo   [OK] Manifest found
) else (
    echo   [ERROR] Manifest missing
)

if exist "m:\USAMKO\chrome-extension\content\google-maps.js" (
    echo   [OK] Google Maps collector found
) else (
    echo   [ERROR] Google Maps script missing
)

REM Test 3: Linkout
echo.
echo [3/8] Testing Linkout Build...
cd /d "m:\USAMKO\linkout"
call npm run build >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] Linkout builds successfully
) else (
    echo   [ERROR] Linkout build failed
    echo   Run 'cd m:/USAMKO/linkout && npm install' to fix
)

REM Test 4: Integration Script
echo.
echo [4/8] Checking Integration Script...
if exist "m:\USAMKO\integrate-with-linkedin-collector.py" (
    echo   [OK] Integration script found
) else (
    echo   [ERROR] Integration script missing
)

REM Test 5: LinkedIn Collector
echo.
echo [5/8] Checking LinkedIn Collector...
if exist "C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)\discover_companies.py" (
    echo   [OK] LinkedIn scripts found
) else (
    echo   [ERROR] LinkedIn collector not found
    echo   Expected location: C:\Users\moham\Desktop\linkedin-lead-collector-fixed (1)\
)

REM Test 6: Documentation
echo.
echo [6/8] Checking Documentation...
if exist "m:\USAMKO\START_HERE.md" (
    echo   [OK] START_HERE.md found
) else (
    echo   [ERROR] START_HERE.md missing
)

if exist "m:\USAMKO\MASTER_LEAD_GENERATION_SYSTEM.md" (
    echo   [OK] Master guide found
) else (
    echo   [ERROR] Master guide missing
)

REM Test 7: Check Python Dependencies
echo.
echo [7/8] Checking Python Dependencies...
python -c "import pandas" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] pandas installed
) else (
    echo   [WARNING] pandas not installed (run: pip install pandas)
)

python -c "import requests" >nul 2>&1
if %ERRORLEVEL%==0 (
    echo   [OK] requests installed
) else (
    echo   [WARNING] requests not installed (run: pip install requests)
)

REM Test 8: Check Node Dependencies
echo.
echo [8/8] Checking Node Dependencies...
cd /d "m:\USAMKO\linkout"
if exist "node_modules" (
    echo   [OK] Node modules installed
) else (
    echo   [WARNING] Node modules not installed
    echo   Run: cd m:/USAMKO/linkout && npm install
)

REM Summary
echo.
echo ══════════════════════════════════════════════════════════
echo   TEST COMPLETE
echo ══════════════════════════════════════════════════════════
echo.
echo   Next Steps:
echo   1. Run MASTER_LAUNCHER.bat for interactive menu
echo   2. Read START_HERE.md for usage instructions
echo   3. Follow FINAL_VERIFICATION.md to test end-to-end
echo.
echo   Documentation:
echo   - START_HERE.md - Quick start guide
echo   - MASTER_LEAD_GENERATION_SYSTEM.md - Complete workflows
echo   - ALL_TOOLS_SUMMARY.txt - Tool comparison
echo.

pause
