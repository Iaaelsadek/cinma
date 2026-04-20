#!/bin/bash

# ==========================================
# 🔐 GitHub Secrets Setup Script
# ==========================================
# This script adds all available secrets from .env to GitHub
# Requires: GitHub CLI (gh) installed and authenticated
# Usage: bash scripts/setup-github-secrets.sh
# ==========================================

set -e

echo "🔐 Setting up GitHub Secrets..."
echo ""

# Check if gh CLI is installed
if ! command -v gh &> /dev/null; then
    echo "❌ GitHub CLI (gh) is not installed!"
    echo "📥 Install it from: https://cli.github.com/"
    exit 1
fi

# Check if authenticated
if ! gh auth status &> /dev/null; then
    echo "❌ Not authenticated with GitHub CLI!"
    echo "🔑 Run: gh auth login"
    exit 1
fi

# Load .env file
if [ ! -f .env ]; then
    echo "❌ .env file not found!"
    exit 1
fi

source .env

echo "✅ GitHub CLI is ready"
echo "✅ .env file loaded"
echo ""

# Function to set secret
set_secret() {
    local name=$1
    local value=$2
    
    if [ -z "$value" ]; then
        echo "⚠️  Skipping $name (empty value)"
        return
    fi
    
    echo "📝 Setting $name..."
    echo "$value" | gh secret set "$name"
}

echo "🚀 Adding secrets to GitHub..."
echo ""

# ==========================================
# Database & APIs
# ==========================================
set_secret "COCKROACHDB_URL" "$COCKROACHDB_URL"
set_secret "VITE_TMDB_API_KEY" "$VITE_TMDB_API_KEY"
set_secret "MISTRAL_API_KEY" "$MISTRAL_API_KEY"

# ==========================================
# Supabase (Auth)
# ==========================================
set_secret "VITE_SUPABASE_URL" "$VITE_SUPABASE_URL"
set_secret "VITE_SUPABASE_ANON_KEY" "$VITE_SUPABASE_ANON_KEY"

# ==========================================
# AI APIs
# ==========================================
set_secret "VITE_GROQ_API_KEY" "$GROQ_API_KEY"
set_secret "VITE_GEMINI_API_KEY" "$GEMINI_API_KEY"

# ==========================================
# Site Configuration
# ==========================================
set_secret "VITE_SITE_URL" "$VITE_SITE_URL"
set_secret "VITE_SITE_NAME" "$VITE_SITE_NAME"
set_secret "VITE_DOMAIN" "$VITE_DOMAIN"
set_secret "VITE_API_KEY" "$VITE_API_KEY"

echo ""
echo "✅ All available secrets have been added!"
echo ""
echo "⚠️  MISSING SECRETS (you need to add these manually):"
echo "   - CLOUDFLARE_API_TOKEN"
echo "   - CLOUDFLARE_ACCOUNT_ID"
echo "   - KOYEB_API_TOKEN (optional if auto-deploy is enabled)"
echo ""
echo "📚 See: docs/GITHUB_SECRETS_GUIDE.md for instructions"
