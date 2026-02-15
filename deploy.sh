#!/bin/bash

# Deploy Script for Cinema Online (Linux/Mac)
# Usage: ./deploy.sh [commit_message]

echo "=========================================="
echo "Starting Deployment Process for Cinema Online"
echo "=========================================="

# 1. Check for TypeScript errors
echo "[1/4] Checking for errors (TypeScript)..."
npx tsc --noEmit
if [ $? -ne 0 ]; then
    echo "Error: TypeScript check failed. Please fix errors before deploying."
    exit 1
fi
echo "TypeScript check passed."

# 2. Build the project
echo "[2/4] Building the project..."
npm run build
if [ $? -ne 0 ]; then
    echo "Error: Build failed."
    exit 1
fi
echo "Build successful."

# 3. Git Commit
echo "[3/4] Committing changes..."
git add .
COMMIT_MSG="$1"
if [ -z "$COMMIT_MSG" ]; then
    COMMIT_MSG="Update content and fixes"
fi
git commit -m "$COMMIT_MSG"

# 4. Git Push
echo "[4/4] Pushing to GitHub..."
git push
if [ $? -ne 0 ]; then
    echo "Error: Git push failed."
    exit 1
fi

echo "=========================================="
echo "Deployment Complete! Changes pushed to GitHub."
echo "If Cloudflare Pages is connected, it will auto-deploy shortly."
echo "=========================================="
