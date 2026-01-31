#!/usr/bin/env powershell

# Deployment script for Vercel (Direct deployment without GitHub)
Write-Host "======================================" -ForegroundColor Green
Write-Host "Deploying to Vercel" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Set project directory
$projectDir = "C:\Users\seuna\OneDrive - CUL Host\Desktop\pat-proj\pw_merchants"
Set-Location $projectDir

# Remove git remotes temporarily to avoid GitHub linking
Write-Host "`nRemoving git remotes for direct deployment..." -ForegroundColor Yellow
$remotes = git remote
foreach ($remote in $remotes) {
    git remote remove $remote
}

# Deploy to Vercel directly
Write-Host "`nDeploying to Vercel..." -ForegroundColor Yellow
vercel --prod --yes

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
Write-Host "`nNext steps:" -ForegroundColor Cyan
Write-Host "1. Go to Vercel dashboard to set environment variables" -ForegroundColor White
Write-Host "2. Add your Supabase DATABASE_URL" -ForegroundColor White
Write-Host "3. Add SECRET_KEY, PAYSTACK keys, and email settings" -ForegroundColor White
