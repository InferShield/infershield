# InferShield Windows Installer
# Quick setup for PowerShell scanner and git hooks

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   InferShield Manual Integration Setup (Windows)" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

# Check PowerShell version
if ($PSVersionTable.PSVersion.Major -lt 5) {
    Write-Host "⚠️  Warning: PowerShell 5.0 or higher recommended" -ForegroundColor Yellow
    Write-Host "Current version: $($PSVersionTable.PSVersion)" -ForegroundColor Yellow
    Write-Host ""
}

# Install scanner script
Write-Host "Installing PowerShell scanner..."
$installDir = "$env:USERPROFILE\bin"
if (-not (Test-Path $installDir)) {
    New-Item -ItemType Directory -Path $installDir | Out-Null
}

Copy-Item "scripts\infershield-scan.ps1" "$installDir\" -Force
Write-Host "✅ Installed: $installDir\infershield-scan.ps1" -ForegroundColor Green
Write-Host ""

# Check if in PATH
$userPath = [System.Environment]::GetEnvironmentVariable('Path', 'User')
if ($userPath -notlike "*$installDir*") {
    Write-Host "⚠️  $installDir not in PATH" -ForegroundColor Yellow
    Write-Host ""
    $addPath = Read-Host "Add to PATH? (y/n)"
    if ($addPath -eq 'y') {
        $newPath = "$userPath;$installDir"
        [System.Environment]::SetEnvironmentVariable('Path', $newPath, 'User')
        Write-Host "✅ Added to PATH (restart terminal to apply)" -ForegroundColor Green
    }
    Write-Host ""
}

# Install git hook (if in a repo)
if (Test-Path ".git") {
    Write-Host "Git repository detected!" -ForegroundColor Cyan
    Write-Host ""
    $installHook = Read-Host "Install pre-commit hook? (y/n)"
    
    if ($installHook -eq 'y') {
        $hookPath = ".git\hooks\pre-commit"
        
        if (Test-Path $hookPath) {
            Write-Host "⚠️  Pre-commit hook already exists" -ForegroundColor Yellow
            $overwrite = Read-Host "Overwrite? (y/n)"
            if ($overwrite -ne 'y') {
                Write-Host "Skipped git hook installation."
                $hookPath = $null
            }
        }
        
        if ($hookPath) {
            Copy-Item "scripts\pre-commit-hook" $hookPath -Force
            Write-Host "✅ Installed: $hookPath" -ForegroundColor Green
            Write-Host ""
            Write-Host "Note: Git hooks run in Git Bash, not PowerShell" -ForegroundColor Yellow
            Write-Host "Make sure Git for Windows is installed" -ForegroundColor Yellow
        }
    }
    Write-Host ""
}

# Configure environment
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "   Configuration" -ForegroundColor Cyan
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""

if (-not $env:INFERSHIELD_API_KEY) {
    Write-Host "⚠️  INFERSHIELD_API_KEY not set" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Get your API key:"
    Write-Host "  1. Go to: http://localhost:8080/dashboard.html"
    Write-Host "  2. Navigate to: API Keys"
    Write-Host "  3. Create a new key"
    Write-Host ""
    Write-Host "Then set it:"
    Write-Host "  [System.Environment]::SetEnvironmentVariable('INFERSHIELD_API_KEY', 'isk_live_...', 'User')"
    Write-Host "  [System.Environment]::SetEnvironmentVariable('INFERSHIELD_ENDPOINT', 'http://localhost:5000', 'User')"
    Write-Host ""
} else {
    Write-Host "✅ API key configured" -ForegroundColor Green
    Write-Host ""
}

Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host ""
Write-Host "Test it:"
Write-Host "  echo 'const key=\""sk-test123\"";' | .\infershield-scan.ps1"
Write-Host ""
Write-Host "Or:"
Write-Host "  .\infershield-scan.ps1 mycode.js"
Write-Host ""
Write-Host "Documentation:"
Write-Host "  docs\MANUAL_INTEGRATION.md"
Write-Host ""
