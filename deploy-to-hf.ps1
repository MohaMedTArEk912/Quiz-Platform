# Hugging Face Space Deployment Script (PowerShell)
# This script helps deploy the Quiz Platform to Hugging Face Spaces

Write-Host "🚀 Quiz Platform - Hugging Face Deployment Helper" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan
Write-Host ""

# Check if git is installed
try {
    git --version | Out-Null
} catch {
    Write-Host "❌ Error: git is not installed" -ForegroundColor Red
    exit 1
}

# Check if we're on the right branch
$currentBranch = git rev-parse --abbrev-ref HEAD
if ($currentBranch -ne "huggingface-deployment") {
    Write-Host "⚠️  Warning: You're not on the huggingface-deployment branch" -ForegroundColor Yellow
    $switch = Read-Host "Switch to huggingface-deployment branch? (y/n)"
    if ($switch -eq "y" -or $switch -eq "Y") {
        git checkout huggingface-deployment
    } else {
        Write-Host "❌ Aborted" -ForegroundColor Red
        exit 1
    }
}

# Get HF Space username and name
$hfUsername = Read-Host "Enter your Hugging Face username"
$spaceName = Read-Host "Enter your Space name (e.g., quiz-platform)"

$hfSpaceUrl = "https://huggingface.co/spaces/$hfUsername/$spaceName"
$appUrl = "https://$hfUsername-$spaceName.hf.space"

Write-Host ""
Write-Host "📝 Configuration:" -ForegroundColor Green
Write-Host "  - Branch: huggingface-deployment"
Write-Host "  - Space URL: $hfSpaceUrl"
Write-Host "  - Your app will be at: $appUrl"
Write-Host ""

# Check if remote exists
$remoteExists = $false
try {
    $existingUrl = git remote get-url hf 2>$null
    $remoteExists = $true
    Write-Host "✅ HF remote already exists" -ForegroundColor Green
    
    if ($existingUrl -ne $hfSpaceUrl) {
        Write-Host "⚠️  Existing HF remote points to: $existingUrl" -ForegroundColor Yellow
        $update = Read-Host "Update remote URL? (y/n)"
        if ($update -eq "y" -or $update -eq "Y") {
            git remote set-url hf $hfSpaceUrl
            Write-Host "✅ Updated HF remote URL" -ForegroundColor Green
        }
    }
} catch {
    Write-Host "➕ Adding HF remote..." -ForegroundColor Yellow
    git remote add hf $hfSpaceUrl
    Write-Host "✅ HF remote added" -ForegroundColor Green
}

Write-Host ""
$push = Read-Host "🚀 Push to Hugging Face Space now? (y/n)"
if ($push -eq "y" -or $push -eq "Y") {
    Write-Host "📤 Pushing to Hugging Face..." -ForegroundColor Cyan
    git push hf huggingface-deployment:main
    
    Write-Host ""
    Write-Host "✅ Deployment initiated!" -ForegroundColor Green
    Write-Host ""
    Write-Host "📋 Next steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to: $hfSpaceUrl/settings"
    Write-Host "  2. Add these environment variables in 'Repository secrets':"
    Write-Host "     - MONGODB_URI (your MongoDB connection string)"
    Write-Host "     - JWT_SECRET (random secure string, 32+ chars)"
    Write-Host "       Generate with: node -e `"console.log(require('crypto').randomBytes(32).toString('hex'))`""
    Write-Host "     - GROQ_API_KEY (from https://console.groq.com)"
    Write-Host "     - CLIENT_URL ($appUrl)"
    Write-Host "     - GOOGLE_CLIENT_ID (optional)"
    Write-Host "     - GOOGLE_CLIENT_SECRET (optional)"
    Write-Host ""
    Write-Host "  3. Wait for build to complete (5-10 minutes)"
    Write-Host "  4. Access your app at: $appUrl"
    Write-Host ""
} else {
    Write-Host "❌ Push cancelled" -ForegroundColor Red
    Write-Host ""
    Write-Host "ℹ️  To push manually later:" -ForegroundColor Cyan
    Write-Host "   git push hf huggingface-deployment:main"
}

Write-Host ""
Write-Host "📚 For detailed instructions, see README_HF.md" -ForegroundColor Cyan
