# Push to GitHub with progress tracking
Write-Host "🚀 Starting push to GitHub..." -ForegroundColor Cyan
Write-Host ""

$startTime = Get-Date

# Start push in background
$job = Start-Job -ScriptBlock {
    Set-Location $using:PWD
    git push origin main --progress 2>&1
}

Write-Host "📊 Push started (Job ID: $($job.Id))" -ForegroundColor Green
Write-Host "⏳ This may take several minutes for large commits..." -ForegroundColor Yellow
Write-Host ""

# Monitor progress
$dots = 0
while ($job.State -eq 'Running') {
    $dots = ($dots + 1) % 4
    $progress = "." * $dots
    Write-Host "`r⏳ Pushing$progress   " -NoNewline -ForegroundColor Cyan
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host ""

# Get result
$result = Receive-Job -Job $job
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalSeconds

if ($job.State -eq 'Completed') {
    Write-Host "✅ Push completed successfully!" -ForegroundColor Green
    Write-Host "⏱️  Duration: $([math]::Round($duration, 2)) seconds" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "📝 Output:" -ForegroundColor Yellow
    $result | ForEach-Object { Write-Host $_ }
} else {
    Write-Host "❌ Push failed or timed out" -ForegroundColor Red
    Write-Host "📝 Last output:" -ForegroundColor Yellow
    $result | Select-Object -Last 20 | ForEach-Object { Write-Host $_ }
}

Remove-Job -Job $job
