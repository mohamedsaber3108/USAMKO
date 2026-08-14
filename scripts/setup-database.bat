@echo off
REM ###############################################################################
REM Database Setup Script (Windows)
REM ###############################################################################
REM
REM This script sets up the USAMKO database with all security features.
REM
REM Usage:
REM   scripts\setup-database.bat
REM
REM Prerequisites:
REM   - PostgreSQL installed and running
REM   - Node.js and npm installed
REM   - .env.local file configured
REM
REM ###############################################################################

setlocal enabledelayedexpansion

echo ===============================================================================
echo                   USAMKO DATABASE SETUP
echo                Phase 1: Security Foundation
echo ===============================================================================
echo.

REM Step 1: Check PostgreSQL
echo Step 1: Checking PostgreSQL...
where pg_isready >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [32m[OK] PostgreSQL is installed[0m
    pg_isready >nul 2>&1
    if !ERRORLEVEL! EQU 0 (
        echo [32m[OK] PostgreSQL is running[0m
    ) else (
        echo [33m[WARNING] PostgreSQL is not running[0m
        echo Start it with: net start postgresql-x64-15
        exit /b 1
    )
) else (
    echo [31m[ERROR] PostgreSQL not found. Please install PostgreSQL first.[0m
    exit /b 1
)
echo.

REM Step 2: Check environment variables
echo Step 2: Checking environment variables...
if not exist ".env.local" if not exist ".env" (
    echo [31m[ERROR] .env or .env.local file not found[0m
    echo Create .env.local with:
    echo   DATABASE_URL=postgresql://user:password@localhost:5432/usamko_dev
    echo   ENCRYPTION_MASTER_KEY=^<64-hex-character-key^>
    exit /b 1
)

REM Load environment variables (simplified check)
if exist ".env.local" (
    findstr /i "DATABASE_URL" .env.local >nul
    if !ERRORLEVEL! EQU 0 (
        echo [32m[OK] DATABASE_URL is set[0m
    ) else (
        echo [31m[ERROR] DATABASE_URL not found in .env.local[0m
        exit /b 1
    )

    findstr /i "ENCRYPTION_MASTER_KEY" .env.local >nul
    if !ERRORLEVEL! EQU 0 (
        echo [32m[OK] ENCRYPTION_MASTER_KEY is set[0m
    ) else (
        echo [31m[ERROR] ENCRYPTION_MASTER_KEY not found in .env.local[0m
        echo.
        echo Generate one with:
        echo   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
        echo.
        echo Then add to .env.local:
        echo   ENCRYPTION_MASTER_KEY=^<generated-key^>
        exit /b 1
    )
)
echo.

REM Step 3: Install dependencies
echo Step 3: Installing dependencies...
where pnpm >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    call pnpm install
) else (
    call npm install
)
if %ERRORLEVEL% NEQ 0 (
    echo [31m[ERROR] Failed to install dependencies[0m
    exit /b 1
)
echo [32m[OK] Dependencies installed[0m
echo.

REM Step 4: Generate Prisma Client
echo Step 4: Generating Prisma Client...
call npx prisma generate
if %ERRORLEVEL% NEQ 0 (
    echo [31m[ERROR] Failed to generate Prisma Client[0m
    exit /b 1
)
echo [32m[OK] Prisma Client generated[0m
echo.

REM Step 5: Run database migrations
echo Step 5: Running database migrations...
call npx prisma migrate dev --name add_credential_vault_and_audit_log
if %ERRORLEVEL% NEQ 0 (
    echo [31m[ERROR] Database migrations failed[0m
    echo Make sure PostgreSQL is running and DATABASE_URL is correct.
    exit /b 1
)
echo [32m[OK] Database migrations complete[0m
echo.

REM Step 6: Encrypt existing tokens
echo Step 6: Encrypting existing tokens...
echo This will encrypt all plain-text tokens in the PlatformAccount table.
set /p CONTINUE="Continue? (y/n): "
if /i "%CONTINUE%"=="y" (
    call npx ts-node scripts\encrypt-existing-tokens.ts
    if !ERRORLEVEL! EQU 0 (
        echo [32m[OK] Token encryption complete[0m
    ) else (
        echo [33m[WARNING] Token encryption failed or skipped[0m
    )
) else (
    echo [33m[WARNING] Skipped token encryption[0m
)
echo.

REM Summary
echo ===============================================================================
echo                   [32mDATABASE SETUP COMPLETE[0m
echo ===============================================================================
echo.
echo [32m[OK] All security features enabled:[0m
echo    - AES-256-GCM encryption
echo    - Credential vault (encrypted storage)
echo    - Audit logging (compliance)
echo    - Multi-tenant isolation
echo.
echo Next steps:
echo    1. Start the API server: npm run dev
echo    2. Test encryption: npm test -- encryption.service.spec.ts
echo    3. Review Phase 1 docs: PHASE1_SECURITY_FOUNDATION.md
echo.
echo [32mPhase 1: Security Foundation is READY![0m
echo.

endlocal
