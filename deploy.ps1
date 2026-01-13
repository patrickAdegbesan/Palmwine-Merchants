#!/usr/bin/env powershell

# Deployment script for Vercel
Write-Host "======================================" -ForegroundColor Green
Write-Host "Deploying to Vercel" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green

# Set project directory
$projectDir = "C:\Users\seuna\OneDrive - CUL Host\Desktop\pat-proj\pw_merchants"
Set-Location $projectDir

# Check git status
Write-Host "`n[1/4] Checking git status..." -ForegroundColor Yellow
git status

# Commit changes
Write-Host "`n[2/4] Committing changes..." -ForegroundColor Yellow
git add .
git commit -m "Prepare for Vercel deployment with Supabase"

# Push to repository
Write-Host "`n[3/4] Pushing to repository..." -ForegroundColor Yellow
git push

# Deploy to Vercel
Write-Host "`n[4/4] Deploying to Vercel..." -ForegroundColor Yellow
vercel --prod

Write-Host "`n======================================" -ForegroundColor Green
Write-Host "Deployment complete!" -ForegroundColor Green
Write-Host "======================================" -ForegroundColor Green
