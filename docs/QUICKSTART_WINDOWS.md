# InferShield Quick Start (Windows)

## 🪟 5-Minute Setup for Windows

---

## Step 1: Get Your API Key (1 min)

1. **Open in browser:** http://192.168.1.61:8080/dashboard.html
2. **Navigate to:** API Keys section (sidebar)
3. **Click:** CREATE NEW KEY
4. **Copy the full key** (starts with `isk_live_`)

---

## Step 2: Set Environment Variables (PowerShell)

**Open PowerShell** (Start Menu → search "PowerShell")

```powershell
# Set for current session (temporary)
$env:INFERSHIELD_API_KEY = "isk_live_YOUR_KEY_HERE"  # Replace with your key
$env:INFERSHIELD_ENDPOINT = "http://192.168.1.61:5000"

# Verify
echo $env:INFERSHIELD_API_KEY
```

**To make it permanent:**

```powershell
# Set permanently (persists across sessions)
[System.Environment]::SetEnvironmentVariable('INFERSHIELD_API_KEY', 'isk_live_YOUR_KEY_HERE', 'User')
[System.Environment]::SetEnvironmentVariable('INFERSHIELD_ENDPOINT', 'http://192.168.1.61:5000', 'User')

# Restart PowerShell after this
```

---

## Step 3: Test with curl (PowerShell)

**Windows 10/11 has curl built-in:**

```powershell
curl.exe -X POST http://192.168.1.61:5000/api/analyze `
  -H "X-API-Key: $env:INFERSHIELD_API_KEY" `
  -H "Content-Type: application/json" `
  -d '{"prompt":"const key = \"sk-1234567890abcdef\";","agent_id":"test"}'
```

**Expected:** Should see `"threat_detected":true` in the response! ✅

---

**Alternative (Pure PowerShell):**

```powershell
# More readable PowerShell version
$headers = @{
    "X-API-Key" = $env:INFERSHIELD_API_KEY
    "Content-Type" = "application/json"
}

$body = @{
    prompt = 'const apiKey = "sk-1234567890abcdef";'
    agent_id = "test"
} | ConvertTo-Json

$result = Invoke-RestMethod `
    -Uri "$env:INFERSHIELD_ENDPOINT/api/analyze" `
    -Method Post `
    -Headers $headers `
    -Body $body

# Display results
$result | ConvertTo-Json -Depth 10
```

---

## Step 4: Install CLI Tool (1 min)

**Download the repo** (if you haven't already):

```powershell
# Option A: Clone with Git
git clone https://github.com/InferShield/infershield.git
cd infershield

# Option B: Download ZIP from GitHub
# Extract to a folder, then cd to it
```

**Run the installer:**

```powershell
cd path\to\infershield
.\scripts\install-windows.ps1
```

This installs `infershield-scan.ps1` to `%USERPROFILE%\bin\`

---

## Step 5: Test the CLI Scanner (1 min)

**Create a test file with PII:**

```powershell
# Create a bad file
echo 'const openaiKey = "sk-test12345";' > bad.js

# Scan it
.\scripts\infershield-scan.ps1 bad.js
```

**Expected output:**
```
⚠️  THREAT DETECTED (Risk: 85/100)

Threats found:
  • HIGH: api_key - sk-test12345

Redacted version:
  const openaiKey = "[REDACTED_API_KEY]";
```

---

**Test with a clean file:**

```powershell
# Create a good file
echo 'const apiKey = process.env.OPENAI_KEY;' > good.js

# Scan it
.\scripts\infershield-scan.ps1 good.js
```

**Expected output:**
```
✅ No threats detected (Risk: 15/100)
```

---

## Step 6: GitHub Copilot Integration

### Option A: Pre-Commit Hook (Automatic Protection)

**Requirements:**
- Git for Windows installed
- Git Bash available

**Setup:**

```bash
# In Git Bash (not PowerShell)
cd /c/path/to/your/project
cp /c/path/to/infershield/scripts/pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

**Test it:**

```bash
# Create a file with a secret
echo 'const secret = "sk-test123";' > test.js
git add test.js
git commit -m "test"
# Should be BLOCKED! ✅
```

---

### Option B: Manual Scan Before Commit (PowerShell)

```powershell
# In your project directory

# Scan a specific file
.\path\to\infershield-scan.ps1 myfile.js

# Scan all staged changes (requires Git for Windows)
git diff --cached | .\path\to\infershield-scan.ps1

# If clean, commit
git commit -m "your message"
```

---

### Option C: VS Code Integration

**Create a PowerShell task in VS Code:**

1. Open VS Code
2. Press `Ctrl+Shift+P`
3. Type: "Tasks: Configure Task"
4. Select: "Create tasks.json from template"
5. Add this task:

```json
{
  "version": "0.9.0",
  "tasks": [
    {
      "label": "InferShield: Scan Current File",
      "type": "shell",
      "command": "powershell",
      "args": [
        "-File",
        "C:\\path\\to\\infershield\\scripts\\infershield-scan.ps1",
        "${file}"
      ],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      },
      "problemMatcher": []
    }
  ]
}
```

**Usage:**
1. Open a file in VS Code
2. Press `Ctrl+Shift+P`
3. Type: "Tasks: Run Task"
4. Select: "InferShield: Scan Current File"

---

## GitHub Copilot Workflow

**Before accepting Copilot suggestions:**

1. **Copilot suggests code** in VS Code
2. **Copy it** (Ctrl+C)
3. **Save to temp file:**
   ```powershell
   # In PowerShell
   Get-Clipboard > $env:TEMP\copilot-temp.js
   ```
4. **Scan it:**
   ```powershell
   .\infershield-scan.ps1 $env:TEMP\copilot-temp.js
   ```
5. **Review results**
6. **Accept or reject** the suggestion

**Quick alias (add to PowerShell profile):**

```powershell
# Add to: $PROFILE (open with: notepad $PROFILE)
function Scan-Clipboard {
    Get-Clipboard | & "$env:USERPROFILE\bin\infershield-scan.ps1"
}
Set-Alias scan-clip Scan-Clipboard

# Usage:
# 1. Copy Copilot suggestion (Ctrl+C)
# 2. Run: scan-clip
# 3. Review threats
```

---

## Troubleshooting

### Error: "401 Unauthorized"

```powershell
# Check if API key is set
echo $env:INFERSHIELD_API_KEY

# Test if it works
$headers = @{ "X-API-Key" = $env:INFERSHIELD_API_KEY }
Invoke-RestMethod -Uri "$env:INFERSHIELD_ENDPOINT/api/usage/current" -Headers $headers
```

---

### Error: "Cannot be loaded because running scripts is disabled"

**PowerShell execution policy issue:**

```powershell
# Check current policy
Get-ExecutionPolicy

# Set to allow local scripts (recommended)
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# Or run specific script with bypass
powershell -ExecutionPolicy Bypass -File .\infershield-scan.ps1 test.js
```

---

### Error: "Connection refused"

```powershell
# Check if backend is running
curl.exe http://192.168.1.61:5000/health

# Or in PowerShell
Invoke-WebRequest -Uri "http://192.168.1.61:5000/health"
```

---

### Git hook not working

**Git hooks require Git Bash (from Git for Windows):**

1. Make sure Git for Windows is installed
2. Hook should be in: `.git/hooks/pre-commit` (no .ps1 extension)
3. Hook must have Unix line endings (LF, not CRLF)
4. Test hook manually:
   ```bash
   # In Git Bash
   bash .git/hooks/pre-commit
   ```

---

## Full Documentation

- **Quick Start:** `QUICKSTART_WINDOWS.md` (this file)
- **Complete Guide:** `docs\MANUAL_INTEGRATION.md`
- **GitHub:** https://github.com/InferShield/infershield

---

## What You Have Now

✅ **Command-line scanner** (PowerShell + curl)  
✅ **Manual file scanning** (`infershield-scan.ps1`)  
✅ **Git pre-commit hooks** (requires Git Bash)  
✅ **VS Code task integration**  

---

## Coming in v0.8.0

🚀 **Transparent proxy mode** (automatic interception)  
🚀 **VS Code extension** (real-time protection)  
🚀 **No manual scanning needed**  

---

## Next Steps

1. **Test it with the steps above**
2. **Install pre-commit hook in your repos**
3. **Add to your Copilot workflow**
4. **Give us feedback!**

---

**Made with 🛡️ by HoZyne Inc**

Need help? Open an issue: https://github.com/InferShield/infershield/issues
