#!/bin/bash

# Hugging Face Space Deployment Script
# This script helps deploy the Quiz Platform to Hugging Face Spaces

set -e

echo "🚀 Quiz Platform - Hugging Face Deployment Helper"
echo "=================================================="

# Check if git is installed
if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed"
    exit 1
fi

# Check if we're on the right branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "huggingface-deployment" ]; then
    echo "⚠️  Warning: You're not on the huggingface-deployment branch"
    read -p "Switch to huggingface-deployment branch? (y/n) " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        git checkout huggingface-deployment
    else
        echo "❌ Aborted"
        exit 1
    fi
fi

# Get HF Space username and name
read -p "Enter your Hugging Face username: " HF_USERNAME
read -p "Enter your Space name (e.g., quiz-platform): " SPACE_NAME

HF_SPACE_URL="https://huggingface.co/spaces/$HF_USERNAME/$SPACE_NAME"

echo ""
echo "📝 Configuration:"
echo "  - Branch: huggingface-deployment"
echo "  - Space URL: $HF_SPACE_URL"
echo "  - Your app will be at: https://$HF_USERNAME-$SPACE_NAME.hf.space"
echo ""

# Check if remote exists
if git remote get-url hf &> /dev/null; then
    echo "✅ HF remote already exists"
    EXISTING_URL=$(git remote get-url hf)
    if [ "$EXISTING_URL" != "$HF_SPACE_URL" ]; then
        echo "⚠️  Existing HF remote points to: $EXISTING_URL"
        read -p "Update remote URL? (y/n) " -n 1 -r
        echo
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            git remote set-url hf "$HF_SPACE_URL"
            echo "✅ Updated HF remote URL"
        fi
    fi
else
    echo "➕ Adding HF remote..."
    git remote add hf "$HF_SPACE_URL"
    echo "✅ HF remote added"
fi

echo ""
read -p "🚀 Push to Hugging Face Space now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "📤 Pushing to Hugging Face..."
    git push hf huggingface-deployment:main
    echo ""
    echo "✅ Deployment initiated!"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Go to: $HF_SPACE_URL/settings"
    echo "  2. Add these environment variables in 'Repository secrets':"
    echo "     - MONGODB_URI (your MongoDB connection string)"
    echo "     - JWT_SECRET (random secure string, 32+ chars)"
    echo "     - GROQ_API_KEY (from https://console.groq.com)"
    echo "     - CLIENT_URL (https://$HF_USERNAME-$SPACE_NAME.hf.space)"
    echo "     - GOOGLE_CLIENT_ID (optional)"
    echo "     - GOOGLE_CLIENT_SECRET (optional)"
    echo ""
    echo "  3. Wait for build to complete (5-10 minutes)"
    echo "  4. Access your app at: https://$HF_USERNAME-$SPACE_NAME.hf.space"
    echo ""
else
    echo "❌ Push cancelled"
    echo ""
    echo "ℹ️  To push manually later:"
    echo "   git push hf huggingface-deployment:main"
fi

echo ""
echo "📚 For detailed instructions, see README_HF.md"
