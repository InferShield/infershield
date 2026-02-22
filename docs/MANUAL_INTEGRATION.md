# InferShield Manual Integration Guide (v0.7.0)

> **Use InferShield to scan code/prompts for PII and security threats before they reach your AI assistant.**

---

## Quick Start (5 minutes)

### 1. Get Your API Key

1. Go to: http://localhost:8080/dashboard.html (or your InferShield URL)
2. Navigate to: **API Keys** section
3. Click: **CREATE NEW KEY**
4. Name: "Manual Testing"
5. **Copy the full key** (format: `isk_live_...`)

### 2. Set Environment Variable

```bash
# Add to ~/.bashrc or ~/.zshrc
export INFERSHIELD_API_KEY="isk_live_your_key_here"
export INFERSHIELD_ENDPOINT="http://localhost:5000"  # or http://192.168.1.61:5000

# Reload shell
source ~/.bashrc  # or source ~/.zshrc
```

### 3. Test It

```bash
# Test PII detection
curl -X POST $INFERSHIELD_ENDPOINT/api/analyze \
  -H "X-API-Key: $INFERSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "const apiKey = \"sk-1234567890abcdef\"; const email = \"user@example.com\";",
    "agent_id": "manual-test"
  }' | jq '.'
```

**Expected output:**
```json
{
  "success": true,
  "threat_detected": true,
  "risk_score": 85,
  "threats": [
    {
      "type": "pii",
      "severity": "high",
      "pattern": "api_key",
      "matched_text": "sk-1234567890abcdef"
    },
    {
      "type": "pii",
      "severity": "medium",
      "pattern": "email",
      "matched_text": "user@example.com"
    }
  ],
  "redacted_prompt": "const apiKey = \"[REDACTED_API_KEY]\"; const email = \"[REDACTED_EMAIL]\";"
}
```

---

## Integration Methods

### Method 1: Command-Line Scanner

**Create a scanner script:**

```bash
# ~/bin/infershield-scan
#!/bin/bash

if [ -z "$INFERSHIELD_API_KEY" ]; then
  echo "❌ Error: INFERSHIELD_API_KEY not set"
  exit 1
fi

FILE="${1:-/dev/stdin}"
PROMPT=$(cat "$FILE")

RESULT=$(curl -s "${INFERSHIELD_ENDPOINT:-http://localhost:5000}/api/analyze" \
  -H "X-API-Key: $INFERSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":$(echo "$PROMPT" | jq -Rs .),\"agent_id\":\"cli\"}")

THREAT=$(echo "$RESULT" | jq -r '.threat_detected')
RISK=$(echo "$RESULT" | jq -r '.risk_score')

if [ "$THREAT" = "true" ]; then
  echo "⚠️  THREAT DETECTED (Risk: $RISK/100)"
  echo "$RESULT" | jq -r '.threats[] | "  - \(.type): \(.pattern) (\(.severity))"'
  exit 1
else
  echo "✅ No threats detected (Risk: $RISK/100)"
  exit 0
fi
```

**Make it executable:**
```bash
chmod +x ~/bin/infershield-scan
```

**Usage:**
```bash
# Scan a file
infershield-scan mycode.js

# Scan from stdin
echo "const password = '123456';" | infershield-scan

# Scan before committing
git diff HEAD | infershield-scan
```

---

### Method 2: Git Pre-Commit Hook

**Automatically scan staged changes before every commit.**

```bash
# .git/hooks/pre-commit
#!/bin/bash

echo "🛡️  InferShield: Scanning staged changes..."

# Get all staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM)

if [ -z "$STAGED_FILES" ]; then
  echo "No files to scan."
  exit 0
fi

# Scan each file
for FILE in $STAGED_FILES; do
  echo "Scanning: $FILE"
  
  CONTENT=$(git show ":$FILE")
  
  RESULT=$(curl -s "${INFERSHIELD_ENDPOINT:-http://localhost:5000}/api/analyze" \
    -H "X-API-Key: $INFERSHIELD_API_KEY" \
    -H "Content-Type: application/json" \
    -d "{\"prompt\":$(echo "$CONTENT" | jq -Rs .),\"agent_id\":\"git-hook\",\"metadata\":{\"file\":\"$FILE\"}}")
  
  THREAT=$(echo "$RESULT" | jq -r '.threat_detected')
  RISK=$(echo "$RESULT" | jq -r '.risk_score')
  
  if [ "$THREAT" = "true" ]; then
    echo "❌ THREAT DETECTED in $FILE (Risk: $RISK/100)"
    echo "$RESULT" | jq -r '.threats[] | "   - \(.type): \(.pattern) (\(.severity))"'
    echo ""
    echo "Commit blocked. Remove sensitive data and try again."
    echo "Or use: git commit --no-verify (not recommended)"
    exit 1
  else
    echo "✅ $FILE is clean (Risk: $RISK/100)"
  fi
done

echo "✅ All files passed InferShield scan!"
exit 0
```

**Make it executable:**
```bash
chmod +x .git/hooks/pre-commit
```

**Test it:**
```bash
# Create a file with PII
echo "const apiKey = 'sk-test123';" > test.js
git add test.js
git commit -m "test"  # Should be blocked!

# Remove PII
echo "const apiKey = process.env.API_KEY;" > test.js
git add test.js
git commit -m "test"  # Should succeed!
```

---

### Method 3: VS Code Tasks (Manual Scan)

**Add to `.vscode/tasks.json`:**

```json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "InferShield: Scan Current File",
      "type": "shell",
      "command": "curl -s $INFERSHIELD_ENDPOINT/api/analyze -H 'X-API-Key: $INFERSHIELD_API_KEY' -H 'Content-Type: application/json' -d '{\"prompt\":\"'$(cat ${file} | jq -Rs .)'\",\"agent_id\":\"vscode\"}' | jq '.'",
      "problemMatcher": [],
      "presentation": {
        "reveal": "always",
        "panel": "new"
      }
    },
    {
      "label": "InferShield: Scan All Changes",
      "type": "shell",
      "command": "git diff HEAD | curl -s $INFERSHIELD_ENDPOINT/api/analyze -H 'X-API-Key: $INFERSHIELD_API_KEY' -H 'Content-Type: application/json' -d @- | jq '.'",
      "problemMatcher": []
    }
  ]
}
```

**Usage:**
1. `Cmd+Shift+P` (Mac) or `Ctrl+Shift+P` (Windows/Linux)
2. Type: "Tasks: Run Task"
3. Select: "InferShield: Scan Current File"

---

### Method 4: Copilot Workflow (Manual)

**Before accepting Copilot suggestions:**

1. **Copy the suggested code** (don't accept yet)
2. **Save to temp file:** `copilot-suggestion.txt`
3. **Scan it:**
   ```bash
   infershield-scan copilot-suggestion.txt
   ```
4. **Review threats** (if any)
5. **Accept or reject** based on results

**Pro tip:** Create a keyboard shortcut:
```bash
# Add to ~/.bashrc
alias scan-clipboard='pbpaste | infershield-scan'  # Mac
alias scan-clipboard='xclip -o | infershield-scan'  # Linux
```

**Workflow:**
1. Copilot suggests code
2. Copy it (`Cmd+C`)
3. Run: `scan-clipboard`
4. Accept if clean ✅

---

## API Reference

### Endpoint: `/api/analyze`

**Request:**
```bash
POST /api/analyze
Headers:
  X-API-Key: isk_live_...
  Content-Type: application/json
Body:
{
  "prompt": "string (required) - Code or text to analyze",
  "agent_id": "string (optional) - Identifier for tracking",
  "metadata": {
    "file": "string (optional)",
    "language": "string (optional)",
    "context": "string (optional)"
  }
}
```

**Response:**
```json
{
  "success": true,
  "threat_detected": false,
  "risk_score": 25,
  "threats": [
    {
      "type": "pii|injection|sensitive",
      "severity": "low|medium|high|critical",
      "pattern": "email|api_key|ssn|credit_card|etc",
      "matched_text": "actual match",
      "position": { "start": 0, "end": 10 }
    }
  ],
  "redacted_prompt": "Prompt with [REDACTED_*] placeholders",
  "metadata": {
    "scanned_at": "ISO timestamp",
    "scan_duration_ms": 123
  }
}
```

**Threat Types:**
- `pii` - Personal Identifiable Information
- `injection` - Prompt injection attempts
- `sensitive` - API keys, passwords, secrets
- `policy_violation` - Custom policy rules

**Severity Levels:**
- `critical` (90-100): Block immediately
- `high` (70-89): Strong warning, likely PII
- `medium` (40-69): Review recommended
- `low` (0-39): Minor concern

---

## Examples

### Example 1: Scan a Python File

```bash
# test.py
import openai
openai.api_key = "sk-1234567890abcdef"  # Bad!
user_email = "john.doe@example.com"      # Bad!

# Scan it
infershield-scan test.py
```

**Output:**
```
⚠️  THREAT DETECTED (Risk: 85/100)
  - pii: api_key (high)
  - pii: email (medium)
```

---

### Example 2: Scan Clipboard (Mac)

```bash
# Copy code with Cmd+C, then:
pbpaste | curl -s $INFERSHIELD_ENDPOINT/api/analyze \
  -H "X-API-Key: $INFERSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"prompt\":\"$(pbpaste | jq -Rs .)\",\"agent_id\":\"clipboard\"}" \
  | jq '.threat_detected, .risk_score, .threats[].pattern'
```

---

### Example 3: Batch Scan Directory

```bash
# Scan all .js files in src/
find src/ -name "*.js" -exec bash -c '
  echo "Scanning: $0"
  infershield-scan "$0" || echo "FAILED: $0"
' {} \;
```

---

## Troubleshooting

### Error: "401 Unauthorized"
- Check: `echo $INFERSHIELD_API_KEY` (is it set?)
- Verify: API key is active in dashboard
- Test: `curl -H "X-API-Key: $INFERSHIELD_API_KEY" $INFERSHIELD_ENDPOINT/api/usage/current`

### Error: "Connection refused"
- Check: Is InferShield running? `curl $INFERSHIELD_ENDPOINT/health`
- Network: Are you using the right IP? (localhost vs 192.168.x.x)
- Firewall: Port 5000 open?

### Error: "Quota exceeded"
- Check usage: `curl -H "X-API-Key: $INFERSHIELD_API_KEY" $INFERSHIELD_ENDPOINT/api/usage/current`
- Upgrade plan or wait for reset (free tier: 100 req/month)

---

## Next Steps

**Current Limitations (v0.7.0):**
- ❌ Not a transparent proxy (manual scanning only)
- ❌ No real-time Copilot interception
- ❌ No streaming support

**Coming in v0.8.0:**
- ✅ Transparent proxy mode (`/api/proxy`)
- ✅ VS Code extension
- ✅ Real-time interception
- ✅ Automatic blocking

**For now:**
- Use git hooks for commit-time protection
- Use CLI tool for manual scans
- Build it into your workflow

---

## Support

- **Docs:** https://infershield.io/docs
- **API Status:** `curl $INFERSHIELD_ENDPOINT/health`
- **Usage:** `curl -H "X-API-Key: $INFERSHIELD_API_KEY" $INFERSHIELD_ENDPOINT/api/usage/current`
- **GitHub:** https://github.com/InferShield/infershield

---

**Made with 🛡️ by HoZyne Inc**
