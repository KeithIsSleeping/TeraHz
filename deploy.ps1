<#
.SYNOPSIS
    Deploy TeraHz to Azure App Service.

.DESCRIPTION
    Builds the React client, creates a Linux-compatible zip package,
    and deploys to Azure using the standard Azure CLI zip deployment.

    Azure-specific values (resource group, app name) are read from the
    .env file. You can override them with command-line parameters.

.PARAMETER ResourceGroup
    Azure resource group name (overrides AZURE_RESOURCE_GROUP in .env)

.PARAMETER AppName
    Azure web app name (overrides AZURE_APP_NAME in .env)

.EXAMPLE
    .\deploy.ps1
    .\deploy.ps1 -AppName terahz-staging -ResourceGroup terahz-staging-rg
#>
param(
    [string]$ResourceGroup,
    [string]$AppName
)

$ErrorActionPreference = "Stop"
$Root = $PSScriptRoot

# ── Load .env file ──────────────────────────────────────────────────────────────
$envFile = Join-Path $Root ".env"
$envVars = @{}
if (Test-Path $envFile) {
    Get-Content $envFile | ForEach-Object {
        if ($_ -match '^\s*([^#][^=]*?)\s*=\s*(.*?)\s*$') {
            $envVars[$matches[1]] = $matches[2]
        }
    }
}

# Resolve parameters: CLI args take priority, then .env, then error
if (-not $ResourceGroup) { $ResourceGroup = $envVars["AZURE_RESOURCE_GROUP"] }
if (-not $AppName)       { $AppName       = $envVars["AZURE_APP_NAME"] }

if (-not $ResourceGroup) { Write-Error "AZURE_RESOURCE_GROUP not set in .env and -ResourceGroup not provided." }
if (-not $AppName)       { Write-Error "AZURE_APP_NAME not set in .env and -AppName not provided." }

Write-Host "`n=== TeraHz Deployment ===" -ForegroundColor Cyan

# ── Pre-flight checks ──────────────────────────────────────────────────────────
Write-Host "`n[1/5] Pre-flight checks..." -ForegroundColor Yellow

if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI (az) is not installed. Install from https://aka.ms/installazurecli"
}

$account = az account show -o json 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Error "Not logged in to Azure. Run: az login"
}
Write-Host "  Subscription: $($account.name)"

$app = az webapp show --resource-group $ResourceGroup --name $AppName -o json 2>$null | ConvertFrom-Json
if (-not $app) {
    Write-Error "Web app '$AppName' not found in resource group '$ResourceGroup'"
}
Write-Host "  Web app: $($app.defaultHostName) ($($app.state))"

# ── Build client ────────────────────────────────────────────────────────────────
Write-Host "`n[2/5] Building React client..." -ForegroundColor Yellow
Push-Location "$Root\client"
npm install --silent 2>&1 | Out-Null
npm run build 2>&1 | Out-Null
Pop-Location

if (-not (Test-Path "$Root\client\build\index.html")) {
    Write-Error "Client build failed — client/build/index.html not found."
}
Write-Host "  Client built successfully."

# ── Install production dependencies ────────────────────────────────────────────
Write-Host "`n[3/5] Installing production dependencies..." -ForegroundColor Yellow
Push-Location $Root
npm install --omit=dev --silent 2>&1 | Out-Null
Pop-Location
Write-Host "  Dependencies installed."

# ── Create deployment zip ───────────────────────────────────────────────────────
Write-Host "`n[4/5] Creating deployment package..." -ForegroundColor Yellow

$zipPath = Join-Path $Root "deploy.zip"
if (Test-Path $zipPath) { Remove-Item $zipPath -Force }

Add-Type -Assembly System.IO.Compression.FileSystem
$zip = [System.IO.Compression.ZipFile]::Open($zipPath, 'Create')

# Individual files to include
$files = @("index.js", "config.js", "package.json", "package-lock.json")
foreach ($f in $files) {
    $full = Join-Path $Root $f
    if (Test-Path $full) {
        [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $full, $f) | Out-Null
    }
}

# Directories to include (with forward slashes for Linux compatibility)
$dirs = @("node_modules", "custom_modules", "client\build")
foreach ($dir in $dirs) {
    $fullDir = Join-Path $Root $dir
    if (Test-Path $fullDir) {
        Get-ChildItem -Path $fullDir -Recurse -File | ForEach-Object {
            $relative = $_.FullName.Substring($Root.Length + 1).Replace('\', '/')
            [System.IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $relative) | Out-Null
        }
    }
}

$zip.Dispose()

$sizeMB = [math]::Round((Get-Item $zipPath).Length / 1MB, 1)
Write-Host "  Package created: deploy.zip ($sizeMB MB)"

# ── Deploy ──────────────────────────────────────────────────────────────────────
Write-Host "`n[5/5] Deploying to Azure..." -ForegroundColor Yellow

$result = az webapp deployment source config-zip `
    --resource-group $ResourceGroup `
    --name $AppName `
    --src $zipPath `
    -o json 2>&1

# Parse result — az CLI WARNINGs go to stderr which PowerShell treats as errors
$jsonLines = ($result | Where-Object { $_ -notmatch "^(WARNING|az :)" }) -join "`n"
try {
    $deployment = $jsonLines | ConvertFrom-Json
    if ($deployment.active -and $deployment.complete) {
        Write-Host "  Deployment successful!" -ForegroundColor Green
    } else {
        Write-Warning "Deployment completed but may not be active. Check: az webapp log deployment show -g $ResourceGroup -n $AppName"
    }
} catch {
    # If JSON parsing fails, check if the raw output contains success indicators
    if ($result -match '"active":\s*true' -and $result -match '"complete":\s*true') {
        Write-Host "  Deployment successful!" -ForegroundColor Green
    } else {
        Write-Warning "Could not confirm deployment status. Check: az webapp log deployment show -g $ResourceGroup -n $AppName"
        Write-Host ($result -join "`n")
    }
}

# Clean up zip
Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

# ── Summary ─────────────────────────────────────────────────────────────────────
Write-Host "`n=== Deployment Complete ===" -ForegroundColor Cyan
Write-Host "  URL: https://$AppName.azurewebsites.net"
Write-Host "  Logs: az webapp log tail -g $ResourceGroup -n $AppName"
Write-Host ""
