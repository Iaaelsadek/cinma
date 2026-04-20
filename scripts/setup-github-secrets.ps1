# ==========================================
# 🔐 GitHub Secrets Setup Script (PowerShell)
# ==========================================
# This script adds all available secrets from .env to GitHub
# Requires: GitHub CLI (gh) installed and authenticated
# Usage: .\scripts\setup-github-secrets.ps1
# ==========================================

$ErrorActionPreference = "Stop"

Write-Host "🔐 Setting up GitHub Secrets..." -ForegroundColor Cyan
Write-Host ""

# Check if gh CLI is installed
if (-not (Get-Command gh -ErrorAction SilentlyContinue)) {
    Write-Host "❌ GitHub CLI (gh) is not installed!" -ForegroundColor Red
    Write-Host "📥 Install it from: https://cli.github.com/" -ForegroundColor Yellow
    exit 1
}

# Check if authenticated
try {
    gh auth status 2>&1 | Out-Null
} catch {
    Write-Host "❌ Not authenticated with GitHub CLI!" -ForegroundColor Red
    Write-Host "🔑 Run: gh auth login" -ForegroundColor Yellow
    exit 1
}

# Check if .env file exists
if (-not (Test-Path .env)) {
    Write-Host "❌ .env file not found!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ GitHub CLI is ready" -ForegroundColor Green
Write-Host "✅ .env file found" -ForegroundColor Green
Write-Host ""

# Load .env file
$envVars = @{}
Get-Content .env | ForEach-Object {
    if ($_ -match '^([^=]+)=(.*)$') {
        $key = $matches[1].Trim()
        $value = $matches[2].Trim()
        $envVars[$key] = $value
    }
}

# Function to set secret
function Set-GitHubSecret {
    param(
        [string]$Name,
        [string]$Value
    )
    
    if ([string]::IsNullOrWhiteSpace($Value)) {
        Write-Host "⚠️  Skipping $Name (empty value)" -ForegroundColor Yellow
        return
    }
    
    Write-Host "📝 Setting $Name..." -ForegroundColor Cyan
    $Value | gh secret set $Name
}

Write-Host "🚀 Adding secrets to GitHub..." -ForegroundColor Cyan
Write-Host ""

# ==========================================
# Database & APIs
# ==========================================
Set-GitHubSecret "COCKROACHDB_URL" $envVars["COCKROACHDB_URL"]
Set-GitHubSecret "VITE_TMDB_API_KEY" $envVars["VITE_TMDB_API_KEY"]
Set-GitHubSecret "MISTRAL_API_KEY" $envVars["MISTRAL_API_KEY"]

# ==========================================
# Supabase (Auth)
# ==========================================
Set-GitHubSecret "VITE_SUPABASE_URL" $envVars["VITE_SUPABASE_URL"]
Set-GitHubSecret "VITE_SUPABASE_ANON_KEY" $envVars["VITE_SUPABASE_ANON_KEY"]

# ==========================================
# AI APIs
# ==========================================
Set-GitHubSecret "VITE_GROQ_API_KEY" $envVars["GROQ_API_KEY"]
Set-GitHubSecret "VITE_GEMINI_API_KEY" $envVars["GEMINI_API_KEY"]

# ==========================================
# Site Configuration
# ==========================================
Set-GitHubSecret "VITE_SITE_URL" $envVars["VITE_SITE_URL"]
Set-GitHubSecret "VITE_SITE_NAME" $envVars["VITE_SITE_NAME"]
Set-GitHubSecret "VITE_DOMAIN" $envVars["VITE_DOMAIN"]
Set-GitHubSecret "VITE_API_KEY" $envVars["VITE_API_KEY"]

Write-Host ""
Write-Host "✅ All available secrets have been added!" -ForegroundColor Green
Write-Host ""
Write-Host "⚠️  MISSING SECRETS (you need to add these manually):" -ForegroundColor Yellow
Write-Host "   - CLOUDFLARE_API_TOKEN" -ForegroundColor Yellow
Write-Host "   - CLOUDFLARE_ACCOUNT_ID" -ForegroundColor Yellow
Write-Host "   - KOYEB_API_TOKEN (optional if auto-deploy is enabled)" -ForegroundColor Yellow
Write-Host ""
Write-Host "📚 See: docs/GITHUB_SECRETS_GUIDE.md for instructions" -ForegroundColor Cyan
