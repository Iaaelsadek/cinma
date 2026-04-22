#!/bin/bash

# 🔐 Update GitHub Secrets Script
# This script helps you update GitHub repository secrets
# 
# Prerequisites:
# 1. Install GitHub CLI: https://cli.github.com/
# 2. Authenticate: gh auth login
#
# Usage: bash scripts/update-github-secrets.sh

set -e

echo "🔐 GitHub Secrets Updater for 4cima"
echo "=========================================="
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed"
    echo "📥 Install from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub"
    echo "🔑 Run: gh auth login"
    exit 1
fi

echo "✅ GitHub CLI is ready"
echo ""

# Load .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found"
    echo "📝 Create .env from .env.new first"
    exit 1
fi

echo "📂 Loading environment variables from .env..."
source .env

echo ""
echo "🚀 Updating GitHub Secrets..."
echo ""

# Function to set secret
set_secret() {
    local key=$1
    local value=$2
    
    if [ -z "$value" ] || [ "$value" == "REPLACE_WITH_NEW_"* ]; then
        echo "⏭️  Skipping $key (not set)"
        return
    fi
    
    echo "📝 Setting $key..."
    echo "$value" | gh secret set "$key" --body -
    
    if [ $? -eq 0 ]; then
        echo "✅ $key updated"
    else
        echo "❌ Failed to update $key"
    fi
}

# Critical secrets (VITE_* for frontend build)
echo "🔴 Critical Secrets (Frontend):"
set_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL"
set_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY"
set_secret "VITE_TMDB_API_KEY" "$VITE_TMDB_API_KEY"
set_secret "VITE_GEMINI_API_KEY" "$VITE_GEMINI_API_KEY"
set_secret "VITE_GROQ_API_KEY" "$VITE_GROQ_API_KEY"
set_secret "VITE_SITE_NAME" "$VITE_SITE_NAME"
set_secret "VITE_DOMAIN" "$VITE_DOMAIN"
set_secret "VITE_SITE_URL" "$VITE_SITE_URL"
set_secret "VITE_API_URL" "$VITE_API_URL"
set_secret "VITE_API_BASE" "$VITE_API_BASE"
set_secret "VITE_API_KEY" "$VITE_API_KEY"
set_secret "VITE_ADMIN_KEY" "$VITE_ADMIN_KEY"

echo ""
echo "🟡 Backend Secrets:"
set_secret "COCKROACHDB_URL" "$COCKROACHDB_URL"
set_secret "SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_SERVICE_ROLE_KEY"
set_secret "MISTRAL_API_KEY" "$MISTRAL_API_KEY"
set_secret "ADMIN_KEY" "$ADMIN_KEY"
set_secret "API_KEY" "$API_KEY"

echo ""
echo "🟢 Optional Secrets:"
set_secret "TURSO_DATABASE_URL" "$TURSO_DATABASE_URL"
set_secret "TURSO_AUTH_TOKEN" "$TURSO_AUTH_TOKEN"
set_secret "YOUTUBE_API_KEY" "$YOUTUBE_API_KEY"
set_secret "PEXELS_API_KEY" "$PEXELS_API_KEY"
set_secret "IGDB_CLIENT_ID" "$IGDB_CLIENT_ID"
set_secret "IGDB_CLIENT_SECRET" "$IGDB_CLIENT_SECRET"
set_secret "GOOGLE_CLIENT_ID" "$GOOGLE_CLIENT_ID"
set_secret "GOOGLE_CLIENT_SECRET" "$GOOGLE_CLIENT_SECRET"
set_secret "XAI_API_KEY" "$XAI_API_KEY"
set_secret "OPENROUTER_API_KEY_1" "$OPENROUTER_API_KEY_1"
set_secret "OPENROUTER_API_KEY_2" "$OPENROUTER_API_KEY_2"
set_secret "OPENROUTER_API_KEY_3" "$OPENROUTER_API_KEY_3"
set_secret "GROQ_API_KEY" "$GROQ_API_KEY"

echo ""
echo "=========================================="
echo "✅ GitHub Secrets update complete!"
echo ""
echo "📋 Next steps:"
echo "1. Verify secrets: gh secret list"
echo "2. Test deployment: git push"
echo ""
