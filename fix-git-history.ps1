# Script to clean large files from Git history
# Run this in PowerShell in the project directory

Write-Host "🧹 Cleaning Git history from large files..." -ForegroundColor Yellow
Write-Host ""

# Remove files from all commits
Write-Host "Step 1: Removing movie_ids.json from history..." -ForegroundColor Cyan
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch scripts/ingestion/movie_ids.json" --prune-empty --tag-name-filter cat -- --all

Write-Host ""
Write-Host "Step 2: Removing tv_series_ids.json from history..." -ForegroundColor Cyan
git filter-branch --force --index-filter "git rm --cached --ignore-unmatch scripts/ingestion/tv_series_ids.json" --prune-empty --tag-name-filter cat -- --all

Write-Host ""
Write-Host "Step 3: Cleaning up..." -ForegroundColor Cyan
git reflog expire --expire=now --all
git gc --prune=now --aggressive

Write-Host ""
Write-Host "✅ Done! Now you can push with:" -ForegroundColor Green
Write-Host "   git push origin main --force" -ForegroundColor Yellow
Write-Host ""
Write-Host "⚠️  WARNING: This will rewrite history. Make sure no one else is working on the repo!" -ForegroundColor Red
