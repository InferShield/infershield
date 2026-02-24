# Quick Start: Test InferShield Now (5 minutes)

## Step 1: Get Your API Key (1 min)

1. Open: http://192.168.1.61:8080/dashboard.html
2. Go to: **API Keys** section (sidebar)
3. Click: **CREATE NEW KEY**
   - Name: "Testing"
   - Environment: Production
4. **COPY THE FULL KEY** (starts with `isk_live_`)

## Step 2: Set Environment Variables (30 sec)

```bash
# Run these commands in your terminal
export INFERSHIELD_API_KEY="isk_live_YOUR_KEY_HERE"  # Replace with your key
export INFERSHIELD_ENDPOINT="http://192.168.1.61:5000"

# Verify
echo $INFERSHIELD_API_KEY
```

## Step 3: Test with curl (1 min)

```bash
# Test 1: Detect API key in code
curl -X POST $INFERSHIELD_ENDPOINT/api/analyze \
  -H "X-API-Key: $INFERSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "const openai_key = \"sk-1234567890abcdef\";",
    "agent_id": "test"
  }' | jq '.'
```

**Expected:** Should show `"threat_detected": true` with API key pattern detected!

```bash
# Test 2: Clean code (no threats)
curl -X POST $INFERSHIELD_ENDPOINT/api/analyze \
  -H "X-API-Key: $INFERSHIELD_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "prompt": "const key = process.env.OPENAI_KEY;",
    "agent_id": "test"
  }' | jq '.'
```

**Expected:** Should show `"threat_detected": false` ✅

## Step 4: Install CLI Tool (1 min)

```bash
cd ~/.openclaw/workspace/infershield
./scripts/install-manual.sh
```

**Or manually:**
```bash
# Copy scanner to ~/bin
mkdir -p ~/bin
cp ~/.openclaw/workspace/infershield/scripts/infershield-scan ~/bin/
chmod +x ~/bin/infershield-scan

# Add to PATH (if not already)
echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc
```

## Step 5: Use the CLI Tool (1 min)

```bash
# Test with a bad file
echo 'const apiKey = "sk-test12345";' > /tmp/bad-code.js
infershield-scan /tmp/bad-code.js
# Should show: ⚠️ THREAT DETECTED

# Test with a good file
echo 'const apiKey = process.env.API_KEY;' > /tmp/good-code.js
infershield-scan /tmp/good-code.js
# Should show: ✅ No threats detected
```

## Step 6: GitHub Copilot Workflow

### Option A: Pre-Commit Hook (Automatic)

```bash
# In any git repo
cd /path/to/your/project
cp ~/.openclaw/workspace/infershield/scripts/pre-commit-hook .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit

# Test it
echo 'const secret = "sk-test123";' > test.js
git add test.js
git commit -m "test"
# Should be BLOCKED! ✅
```

### Option B: Manual Workflow (Before Accepting Copilot)

1. **Copilot suggests code** in VS Code
2. **Copy it** (Cmd+C / Ctrl+C)
3. **Paste to file:** `pbpaste > /tmp/copilot-suggestion.txt` (Mac)
4. **Scan it:** `infershield-scan /tmp/copilot-suggestion.txt`
5. **Review results**
6. **Accept or reject** the suggestion

### Option C: Scan Before Commit

```bash
# Before committing, scan your changes:
git diff HEAD | infershield-scan

# If clean, commit:
git commit -m "your message"
```

---

## Next Steps

**Read full documentation:**
- `docs/MANUAL_INTEGRATION.md` - Complete guide with all methods

**Coming in v0.8.0:**
- Transparent proxy mode (no manual scanning needed!)
- VS Code extension (real-time interception)
- Automatic Copilot protection

---

## Troubleshooting

**"401 Unauthorized"**
```bash
# Check if API key is set
echo $INFERSHIELD_API_KEY

# Test if it works
curl -H "X-API-Key: $INFERSHIELD_API_KEY" \
  $INFERSHIELD_ENDPOINT/api/usage/current | jq '.'
```

**"Connection refused"**
```bash
# Check if backend is running
curl http://192.168.1.61:5000/health

# If not running, start it:
cd ~/.openclaw/workspace/infershield/backend
npm start
```

**"Command not found: infershield-scan"**
```bash
# Check if ~/bin is in PATH
echo $PATH | grep "$HOME/bin"

# If not, add it:
export PATH="$HOME/bin:$PATH"
```

---

## Ready to Ship v0.9.0!

Once you've tested this, we can:
1. Tag v0.9.0
2. Create GitHub release
3. Next: v1.0 (distributed sessions + Redis)

**Test it now and let me know how it goes!** 🚀
