@echo off
echo ==========================================
echo Starting Deployment Process for Cinema Online
echo ==========================================

echo [1/4] Checking for errors (TypeScript)...
call npx tsc --noEmit
if %errorlevel% neq 0 (
    echo Error: TypeScript check failed. Please fix errors before deploying.
    pause
    exit /b %errorlevel%
)

echo [2/4] Building the project...
call npm run build
if %errorlevel% neq 0 (
    echo Error: Build failed.
    pause
    exit /b %errorlevel%
)

echo [3/4] Adding changes to Git...
git add .
set /p commit_msg="Enter commit message (default: 'Update content and fixes'): "
if "%commit_msg%"=="" set commit_msg="Update content and fixes"
git commit -m "%commit_msg%"

echo [4/4] Pushing to GitHub (Triggers Cloudflare Pages)...
git push

echo ==========================================
echo Deployment Pushed Successfully!
echo Changes should be live on Cloudflare Pages in ~60 seconds.
echo ==========================================
pause
