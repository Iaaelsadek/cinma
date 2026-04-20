# 🗑️ GitHub Workflows Cleanup Script
# This script deletes old failed workflow runs from GitHub Actions

Write-Host "🗑️ GitHub Workflows Cleanup Script" -ForegroundColor Cyan
Write-Host "===================================" -ForegroundColor Cyan
Write-Host ""

# Check if GitHub CLI is installed
$ghInstalled = Get-Command gh -ErrorAction SilentlyContinue
if (-not $ghInstalled) {
    Write-Host "❌ GitHub CLI is not installed!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please install GitHub CLI first:" -ForegroundColor Yellow
    Write-Host "  winget install --id GitHub.cli" -ForegroundColor White
    Write-Host "  or visit: https://cli.github.com/" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ GitHub CLI is installed" -ForegroundColor Green
Write-Host ""

# Check if authenticated
$authStatus = gh auth status 2>&1
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Not authenticated with GitHub!" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please authenticate first:" -ForegroundColor Yellow
    Write-Host "  gh auth login" -ForegroundColor White
    Write-Host ""
    exit 1
}

Write-Host "✅ Authenticated with GitHub" -ForegroundColor Green
Write-Host ""

# Get repository info
$repo = "Iaaelsadek/cinma"
Write-Host "📦 Repository: $repo" -ForegroundColor Cyan
Write-Host ""

# Function to delete workflow runs
function Remove-WorkflowRuns {
    param(
        [string]$Status,
        [int]$Limit = 100
    )
    
    Write-Host "🔍 Fetching $Status workflow runs (limit: $Limit)..." -ForegroundColor Yellow
    
    $runs = gh run list `
        --repo $repo `
        --status=$Status `
        --limit=$Limit `
        --json databaseId `
        --jq '.[].databaseId'
    
    if (-not $runs) {
        Write-Host "✅ No $Status runs found!" -ForegroundColor Green
        return 0
    }
    
    $runIds = $runs -split "`n" | Where-Object { $_ -ne "" }
    $count = $runIds.Count
    
    Write-Host "📊 Found $count $Status runs" -ForegroundColor Cyan
    Write-Host ""
    
    $deleted = 0
    $failed = 0
    
    foreach ($runId in $runIds) {
        try {
            Write-Host "🗑️  Deleting run $runId..." -NoNewline
            gh run delete $runId --repo $repo 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ✅" -ForegroundColor Green
                $deleted++
            } else {
                Write-Host " ❌" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " ❌ Error: $_" -ForegroundColor Red
            $failed++
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "  ✅ Deleted: $deleted" -ForegroundColor Green
    Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
    Write-Host ""
    
    return $deleted
}

# Function to delete ALL workflow runs (regardless of status)
function Remove-AllWorkflowRuns {
    param(
        [int]$Limit = 100
    )
    
    Write-Host "🔍 Fetching workflow runs (limit: $Limit)..." -ForegroundColor Yellow
    
    $runs = gh run list `
        --repo $repo `
        --limit=$Limit `
        --json databaseId `
        --jq '.[].databaseId'
    
    if (-not $runs) {
        Write-Host "✅ No runs found!" -ForegroundColor Green
        return 0
    }
    
    $runIds = $runs -split "`n" | Where-Object { $_ -ne "" }
    $count = $runIds.Count
    
    Write-Host "📊 Found $count runs" -ForegroundColor Cyan
    Write-Host ""
    
    $deleted = 0
    $failed = 0
    
    foreach ($runId in $runIds) {
        try {
            Write-Host "🗑️  Deleting run $runId..." -NoNewline
            gh run delete $runId --repo $repo 2>&1 | Out-Null
            
            if ($LASTEXITCODE -eq 0) {
                Write-Host " ✅" -ForegroundColor Green
                $deleted++
            } else {
                Write-Host " ❌" -ForegroundColor Red
                $failed++
            }
        } catch {
            Write-Host " ❌ Error: $_" -ForegroundColor Red
            $failed++
        }
        
        # Small delay to avoid rate limiting
        Start-Sleep -Milliseconds 100
    }
    
    Write-Host ""
    Write-Host "📊 Summary:" -ForegroundColor Cyan
    Write-Host "  ✅ Deleted: $deleted" -ForegroundColor Green
    Write-Host "  ❌ Failed: $failed" -ForegroundColor Red
    Write-Host ""
    
    return $deleted
}

# Main execution
Write-Host "🚀 Starting cleanup..." -ForegroundColor Cyan
Write-Host ""

# Ask user what to delete
Write-Host "⚠️  WARNING: This will delete workflow runs!" -ForegroundColor Yellow
Write-Host ""
Write-Host "Options:" -ForegroundColor Cyan
Write-Host "  1. Delete FAILED runs only (safe)" -ForegroundColor White
Write-Host "  2. Delete ALL runs (including successful ones)" -ForegroundColor White
Write-Host "  3. Cancel" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Choose an option (1/2/3)"

if ($choice -eq "3") {
    Write-Host ""
    Write-Host "❌ Cancelled by user" -ForegroundColor Yellow
    Write-Host ""
    exit 0
}

$totalDeleted = 0

if ($choice -eq "1") {
    # Delete failed runs only
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "1️⃣  Cleaning up FAILED runs" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    $deleted = Remove-WorkflowRuns -Status "failure" -Limit 100
    $totalDeleted += $deleted

    # Ask if user wants to continue with more batches
    if ($deleted -eq 100) {
        Write-Host "⚠️  There might be more failed runs!" -ForegroundColor Yellow
        Write-Host ""
        $continue = Read-Host "Do you want to delete another batch of 100? (y/n)"
        
        while ($continue -eq "y" -or $continue -eq "Y") {
            Write-Host ""
            $deleted = Remove-WorkflowRuns -Status "failure" -Limit 100
            $totalDeleted += $deleted
            
            if ($deleted -lt 100) {
                break
            }
            
            Write-Host ""
            $continue = Read-Host "Do you want to delete another batch of 100? (y/n)"
        }
    }

    # Optionally delete cancelled runs
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "2️⃣  Cleaning up CANCELLED runs" -ForegroundColor Yellow
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""

    $cleanCancelled = Read-Host "Do you want to delete cancelled runs? (y/n)"
    if ($cleanCancelled -eq "y" -or $cleanCancelled -eq "Y") {
        Write-Host ""
        $deleted = Remove-WorkflowRuns -Status "cancelled" -Limit 100
        $totalDeleted += $deleted
    }
} elseif ($choice -eq "2") {
    # Delete ALL runs
    Write-Host ""
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host "🗑️  Cleaning up ALL workflow runs" -ForegroundColor Red
    Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
    Write-Host ""
    
    Write-Host "⚠️  This will delete ALL workflow runs (including successful ones)!" -ForegroundColor Yellow
    Write-Host ""
    $confirm = Read-Host "Are you sure? Type 'yes' to confirm"
    
    if ($confirm -ne "yes") {
        Write-Host ""
        Write-Host "❌ Cancelled by user" -ForegroundColor Yellow
        Write-Host ""
        exit 0
    }
    
    Write-Host ""
    Write-Host "🚀 Starting mass deletion..." -ForegroundColor Cyan
    Write-Host ""
    
    # Delete in batches until no more runs
    $batchNumber = 1
    do {
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host "Batch #$batchNumber" -ForegroundColor Cyan
        Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
        Write-Host ""
        
        $deleted = Remove-AllWorkflowRuns -Limit 100
        $totalDeleted += $deleted
        
        if ($deleted -gt 0) {
            Write-Host "✅ Batch #$batchNumber complete: $deleted runs deleted" -ForegroundColor Green
            Write-Host "📊 Total deleted so far: $totalDeleted" -ForegroundColor Cyan
            Write-Host ""
            
            # Ask if user wants to continue
            if ($deleted -eq 100) {
                $continue = Read-Host "Continue with next batch? (y/n)"
                if ($continue -ne "y" -and $continue -ne "Y") {
                    Write-Host ""
                    Write-Host "⏸️  Paused by user" -ForegroundColor Yellow
                    break
                }
                Write-Host ""
            }
        }
        
        $batchNumber++
        
    } while ($deleted -gt 0)
}

# Final summary
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host "🎉 Cleanup Complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkGray
Write-Host ""
Write-Host "📊 Total runs deleted: $totalDeleted" -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Your GitHub Actions page should be much cleaner now!" -ForegroundColor Green
Write-Host ""
Write-Host "🔗 View remaining runs at:" -ForegroundColor Cyan
Write-Host "   https://github.com/$repo/actions" -ForegroundColor White
Write-Host ""
