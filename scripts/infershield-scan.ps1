# InferShield Scanner for PowerShell
# Scan code/text for PII and security threats

param(
    [Parameter(ValueFromPipeline=$true)]
    [string]$InputFile,
    [switch]$Help
)

# Colors
$ErrorColor = "Red"
$SuccessColor = "Green"
$WarningColor = "Yellow"

# Help
if ($Help) {
    Write-Host @"
InferShield CLI Scanner v0.7.0 (Windows)

USAGE:
  .\infershield-scan.ps1 [FILE]
  Get-Content file.js | .\infershield-scan.ps1
  
EXAMPLES:
  .\infershield-scan.ps1 mycode.js          # Scan a file
  echo "const key='sk-123';" | .\infershield-scan.ps1  # Scan stdin
  git diff HEAD | .\infershield-scan.ps1    # Scan changes
  
ENVIRONMENT VARIABLES:
  INFERSHIELD_API_KEY     API key (required)
  INFERSHIELD_ENDPOINT    API endpoint (default: http://localhost:5000)
  
EXIT CODES:
  0  No threats detected
  1  Threats detected or error
"@
    exit 0
}

# Check API key
$apiKey = $env:INFERSHIELD_API_KEY
if (-not $apiKey) {
    Write-Host "❌ Error: INFERSHIELD_API_KEY not set" -ForegroundColor $ErrorColor
    Write-Host ""
    Write-Host "Set your API key:"
    Write-Host "  `$env:INFERSHIELD_API_KEY = 'isk_live_...'"
    Write-Host ""
    Write-Host "Or permanently:"
    Write-Host "  [System.Environment]::SetEnvironmentVariable('INFERSHIELD_API_KEY', 'isk_live_...', 'User')"
    Write-Host ""
    Write-Host "Get your key at: http://localhost:8080/dashboard.html"
    exit 1
}

# Get endpoint
$endpoint = $env:INFERSHIELD_ENDPOINT
if (-not $endpoint) {
    $endpoint = "http://localhost:5000"
}

# Read input
if ($InputFile) {
    # From file
    if (-not (Test-Path $InputFile)) {
        Write-Host "❌ Error: File not found: $InputFile" -ForegroundColor $ErrorColor
        exit 1
    }
    $content = Get-Content $InputFile -Raw
} elseif (-not [Console]::IsInputRedirected) {
    Write-Host "❌ Error: No input provided" -ForegroundColor $ErrorColor
    Write-Host "Usage: .\infershield-scan.ps1 <file> or pipe content" -ForegroundColor $WarningColor
    exit 1
} else {
    # From stdin
    $content = $input | Out-String
}

if (-not $content) {
    Write-Host "❌ Error: No input provided" -ForegroundColor $ErrorColor
    exit 1
}

# Call API
try {
    $headers = @{
        "X-API-Key" = $apiKey
        "Content-Type" = "application/json"
    }
    
    $body = @{
        prompt = $content
        agent_id = "powershell"
    } | ConvertTo-Json
    
    $response = Invoke-RestMethod -Uri "$endpoint/api/analyze" `
        -Method Post `
        -Headers $headers `
        -Body $body `
        -ErrorAction Stop
    
    # Parse results
    $threat = $response.threat_detected
    $risk = $response.risk_score
    
    Write-Host ""
    
    if ($threat) {
        Write-Host "⚠️  THREAT DETECTED (Risk: $risk/100)" -ForegroundColor $ErrorColor
        Write-Host ""
        Write-Host "Threats found:"
        foreach ($t in $response.threats) {
            $sev = $t.severity.ToUpper()
            $pattern = $t.pattern
            $matched = $t.matched_text
            if ($matched) {
                Write-Host "  • $sev`: $pattern - $matched" -ForegroundColor $ErrorColor
            } else {
                Write-Host "  • $sev`: $pattern" -ForegroundColor $ErrorColor
            }
        }
        Write-Host ""
        Write-Host "Redacted version:"
        Write-Host "  $($response.redacted_prompt)" -ForegroundColor $WarningColor
        Write-Host ""
        exit 1
    } else {
        Write-Host "✅ No threats detected (Risk: $risk/100)" -ForegroundColor $SuccessColor
        Write-Host ""
        exit 0
    }
    
} catch {
    Write-Host "❌ Error: $($_.Exception.Message)" -ForegroundColor $ErrorColor
    
    if ($_.Exception.Response) {
        $statusCode = [int]$_.Exception.Response.StatusCode
        Write-Host "Status Code: $statusCode" -ForegroundColor $ErrorColor
    }
    
    exit 1
}
