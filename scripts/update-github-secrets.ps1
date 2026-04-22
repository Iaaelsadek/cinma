# 🔐 Update GitHub Secrets Script (PowerShell)
# This script helps you update GitHub repository secrets
# 
# Prerequisites:
# 1. Install GitHub CLI: winget install GitHub.cli
# 2. Authenticate: gh auth login
#
# Usage: .\scripts\update-github-secrets.ps1

$ErrorActionPreference = "Stop"

Write-Host "🔐 GitHub Secrets Updater for 4cima" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check if gh CLI is installed
try {
    $null = Get-Command gh -ErrorAction Stop
    Write-Host "✅ GitHub CLI is installed" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub CLI (gh) is not installed" -ForegroundColor Red
    Write-Host "📥 Install: winget install GitHub.cli" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
try {
    gh auth status 2>&1 | Out-Null
    Write-Host "✅ Authenticated with GitHub" -ForegroundColor Green
} catch {
    Write-Host "❌ Not authenticated with GitHub" -ForegroundColor Red
    Write-Host "🔑 Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Load .env file
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found" -ForegroundColor Red
    Write-Host "📝 Create .env from .env.new first" -ForegroundColor Yellow
    exit 1
}

Write-Host "📂 Loading environment variables from .env..." -ForegroundColor Cyan

# Parse .env file
$envVars = @{}
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^#][^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim().Trim('"')
        $envVars[$key] = $value
    }
}

Write-Host ""
Write-Host "🚀 Updating GitHub Secrets..." -ForegroundColor Cyan
Write-Host ""

# Function to set secret
function Set-GitHubSecret {
    param(
        [string]$Key,
        [string]$Value
    )
    
    if ([string]::IsNullOrEmpty($Value) -or $Value.StartsWith("REPLACE_WITH_NEW_")) {
        Write-Host "⏭️  Skipping $Key (not set)" -ForegroundColor Gray
        return
    }
    
    Write-Host "📝 Setting $Key..." -ForegroundColor Yellow
    
    try {
        $Value | gh secret set $Key --body -
        Write-Host "✅ $Key updated" -ForegroundColor Green
    } catch {
        Write-Host "❌ Failed to update $Key" -ForegroundColor Red
    }
}

# Critical secrets (VITE_* for frontend build)
Write-Host "🔴 Critical Secrets (Frontend):" -ForegroundColor Red
Set-GitHubSecret "VITE_SUPABASE_URL" $envVars["VITE_SUPABASE_URL"]
Set-GitHubSecret "VITE_SUPABASE_ANON_KEY" $envVars["VITE_SUPABASE_ANON_KEY"]
Set-GitHubSecret "VITE_TMDB_API_KEY" $envVars["VITE_TMDB_API_KEY"]
Set-GitHubSecret "VITE_GEMINI_API_KEY" $envVars["VITE_GEMINI_API_KEY"]
Set-GitHubSecret "VITE_GROQ_API_KEY" $envVars["VITE_GROQ_API_KEY"]
Set-GitHubSecret "VITE_SITE_NAME" $envVars["VITE_SITE_NAME"]
Set-GitHubSecret "VITE_DOMAIN" $envVars["VITE_DOMAIN"]
Set-GitHubSecret "VITE_SITE_URL" $envVars["VITE_SITE_URL"]
Set-GitHubSecret "VITE_API_URL" $envVars["VITE_API_URL"]
Set-GitHubSecret "VITE_API_BASE" $envVars["VITE_API_BASE"]
Set-GitHubSecret "VITE_API_KEY" $envVars["VITE_API_KEY"]
Set-GitHubSecret "VITE_ADMIN_KEY" $envVars["VITE_ADMIN_KEY"]

Write-Host ""
Write-Host "🟡 Backend Secrets:" -ForegroundColor Yellow
Set-GitHubSecret "COCKROACHDB_URL" $envVars["COCKROACHDB_URL"]
Set-GitHubSecret "SUPABASE_SERVICE_ROLE_KEY" $envVars["SUPABASE_SERVICE_ROLE_KEY"]
Set-GitHubSecret "MISTRAL_API_KEY" $envVars["MISTRAL_API_KEY"]
Set-GitHubSecret "ADMIN_KEY" $envVars["ADMIN_KEY"]
Set-GitHubSecret "API_KEY" $envVars["API_KEY"]

Write-Host ""
Write-Host "🟢 Optional Secrets:" -ForegroundColor Green
Set-GitHubSecret "TURSO_DATABASE_URL" $envVars["TURSO_DATABASE_URL"]
Set-GitHubSecret "TURSO_AUTH_TOKEN" $envVars["TURSO_AUTH_TOKEN"]
Set-GitHubSecret "YOUTUBE_API_KEY" $envVars["YOUTUBE_API_KEY"]
Set-GitHubSecret "PEXELS_API_KEY" $envVars["PEXELS_API_KEY"]
Set-GitHubSecret "IGDB_CLIENT_ID" $envVars["IGDB_CLIENT_ID"]
Set-GitHubSecret "IGDB_CLIENT_SECRET" $envVars["IGDB_CLIENT_SECRET"]
Set-GitHubSecret "GOOGLE_CLIENT_ID" $envVars["GOOGLE_CLIENT_ID"]
Set-GitHubSecret "GOOGLE_CLIENT_SECRET" $envVars["GOOGLE_CLIENT_SECRET"]
Set-GitHubSecret "XAI_API_KEY" $envVars["XAI_API_KEY"]
Set-GitHubSecret "OPENROUTER_API_KEY_1" $envVars["OPENROUTER_API_KEY_1"]
Set-GitHubSecret "OPENROUTER_API_KEY_2" $envVars["OPENROUTER_API_KEY_2"]
Set-GitHubSecret "OPENROUTER_API_KEY_3" $envVars["OPENROUTER_API_KEY_3"]
Set-GitHubSecret "GROQ_API_KEY" $envVars["GROQ_API_KEY"]

Write-Host ""
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "✅ GitHub Secrets update complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Verify secrets: gh secret list" -ForegroundColor White
Write-Host "2. Test deployment: git push" -ForegroundColor White
Write-Host ""
