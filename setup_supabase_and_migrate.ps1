#!/usr/bin/env powershell
<#
Helper script to add Supabase DATABASE_URL and other env vars to Vercel,
pull envs locally, run Django migrations and collectstatic, then redeploy.

Usage: Run this from the project root (where manage.py is).
PS C:\...\pw_merchants> .\setup_supabase_and_migrate.ps1
#>

# Ensure we're in project directory
$projectDir = "C:\Users\seuna\OneDrive - CUL Host\Desktop\pat-proj\pw_merchants"
Set-Location $projectDir

# Check CLI tools
if (-not (Get-Command vercel -ErrorAction SilentlyContinue)) {
    Write-Host "Vercel CLI is not installed. Install with: npm i -g vercel" -ForegroundColor Red
    exit 1
}

# Prompt for DATABASE_URL
Write-Host "Paste your Supabase DATABASE_URL (Postgres connection string)." -ForegroundColor Cyan
$dbUrl = Read-Host "DATABASE_URL (or press Enter to open Supabase to create a project)"
if ([string]::IsNullOrWhiteSpace($dbUrl)) {
    Write-Host "Opening Supabase new project page in your browser..." -ForegroundColor Yellow
    Start-Process "https://app.supabase.com/projects/new"
    Write-Host "Create a project in Supabase, then rerun this script with the project's DATABASE_URL." -ForegroundColor Green
    exit 0
}

# Confirm
Write-Host "I'll add DATABASE_URL to Vercel (production, preview, development) and run migrations locally." -ForegroundColor Yellow
$confirm = Read-Host "Proceed? (y/n)"
if ($confirm -ne 'y') { Write-Host "Aborted."; exit 0 }

# Helper to add an env var non-interactively by piping value into vercel env add
function Add-VercelEnv($name, $env, $value) {
    Write-Host "Adding $name to Vercel ($env)..." -ForegroundColor Cyan
    $value | vercel env add $name $env
}

# Add DATABASE_URL to Vercel
Add-VercelEnv -name 'DATABASE_URL' -env 'production' -value $dbUrl
Add-VercelEnv -name 'DATABASE_URL' -env 'preview' -value $dbUrl
Add-VercelEnv -name 'DATABASE_URL' -env 'development' -value $dbUrl

# Generate SECRET_KEY
try {
    $secret = & python -c "import secrets; print(secrets.token_urlsafe(50))"
} catch {
    $secret = [System.Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes((Get-Random -Minimum 100000 -Maximum 999999).ToString()))
}
Add-VercelEnv -name 'SECRET_KEY' -env 'production' -value $secret
Add-VercelEnv -name 'SECRET_KEY' -env 'preview' -value $secret
Add-VercelEnv -name 'SECRET_KEY' -env 'development' -value $secret

# DEBUG = False in production, True in development
Add-VercelEnv -name 'DEBUG' -env 'production' -value 'False'
Add-VercelEnv -name 'DEBUG' -env 'preview' -value 'False'
Add-VercelEnv -name 'DEBUG' -env 'development' -value 'True'

# ALLOWED_HOSTS
$allowed = ".vercel.app,pwmerchants.vercel.app"
Add-VercelEnv -name 'ALLOWED_HOSTS' -env 'production' -value $allowed
Add-VercelEnv -name 'ALLOWED_HOSTS' -env 'preview' -value $allowed
Add-VercelEnv -name 'ALLOWED_HOSTS' -env 'development' -value "localhost,127.0.0.1"

# Pull envs locally into .env.local file
Write-Host "Pulling env vars to .env.local..." -ForegroundColor Cyan
vercel env pull .env.local --environment development

# Load the DATABASE_URL into current session for running migrations locally
if (Test-Path .env.local) {
    Write-Host "Loading .env.local variables into current session..." -ForegroundColor Cyan
    Get-Content .env.local | ForEach-Object {
        if ($_ -match "^([^=]+)=(.*)$") {
            $name = $matches[1]; $val = $matches[2]
            $env:$name = $val
        }
    }
} else {
    Write-Host ".env.local not found, setting DATABASE_URL in session from provided value..." -ForegroundColor Yellow
    $env:DATABASE_URL = $dbUrl
}

# Run migrations against Supabase DB
Write-Host "Running migrations locally against the Supabase DB..." -ForegroundColor Green
python manage.py migrate

# Collect static files
Write-Host "Collecting static files..." -ForegroundColor Green
python manage.py collectstatic --noinput

# Redeploy to Vercel (production)
Write-Host "Redeploying to Vercel (production)..." -ForegroundColor Green
vercel --prod --yes

Write-Host "
Done. If the site still returns 500, run: vercel logs pwmerchants.vercel.app --since 1h" -ForegroundColor Cyan
