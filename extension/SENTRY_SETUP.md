# Sentry Integration Setup - InferShield Extension

**Status:** ✅ Code ready, awaiting Sentry project creation  
**Timeline:** 30 minutes to complete setup  
**Cost:** $0 (free tier: 5k events/month, enough for MVP)

---

## What Was Added

### 1. **Sentry Configuration Module** (`extension/sentry-config.js`)
- Privacy-first error tracking with automatic PII stripping
- Strips API keys, user text, email addresses, JWT tokens before sending to Sentry
- Ignores non-critical errors (network issues, browser quirks)
- Adds context tags (browser, component, site)

### 2. **Enhanced Background Worker** (`extension/background-with-sentry.js`)
- Wraps all error handlers with Sentry capture
- Global error handlers for uncaught exceptions
- Tracks scan performance (logs slow scans >1s)
- Breadcrumbs for debugging context

---

## Setup Steps (To Complete)

### Step 1: Create Sentry Project (5 minutes)

1. Go to https://sentry.io/signup/ (use free account)
2. Create organization: "InferShield" or "HoZyne"
3. Create project:
   - **Platform:** Browser JavaScript
   - **Project name:** `infershield-extension`
   - **Alert frequency:** Default (first event, regression, etc.)
4. Copy the **DSN** (Data Source Name)
   - Example: `https://abc123@o123456.ingest.sentry.io/456789`

### Step 2: Add Sentry SDK to Extension (10 minutes)

```bash
cd ~/.openclaw/workspace/infershield/extension

# Add Sentry browser SDK
npm install @sentry/browser --save

# Or if using yarn
yarn add @sentry/browser
```

### Step 3: Configure Environment Variable (2 minutes)

Create `.env` file in `extension/` directory:

```bash
# extension/.env
SENTRY_DSN=https://YOUR_ACTUAL_DSN_HERE@o123456.ingest.sentry.io/456789
NODE_ENV=production
```

Add to `.gitignore`:
```
extension/.env
```

### Step 4: Update Manifest & Build Process (5 minutes)

**Option A: Use environment variable at build time (recommended)**

Update `extension/manifest.json` to include Sentry SDK:

```json
{
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_security_policy": {
    "extension_pages": "script-src 'self'; object-src 'self'; connect-src https://o123456.ingest.sentry.io https://app.infershield.io https://localhost:5000"
  }
}
```

**Option B: Inject DSN at build time**

Create build script that replaces `process.env.SENTRY_DSN` with actual value.

### Step 5: Replace Current Background Script (1 minute)

```bash
cd ~/.openclaw/workspace/infershield/extension

# Backup current version
cp background.js background-original.js

# Replace with Sentry-enabled version
cp background-with-sentry.js background.js
```

### Step 6: Test Sentry Integration (5 minutes)

1. **Load extension in Chrome:**
   - Go to `chrome://extensions`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `~/.openclaw/workspace/infershield/extension/` folder

2. **Trigger test error:**
   - Open Chrome DevTools Console
   - Trigger an error manually:
   ```javascript
   chrome.runtime.sendMessage({ action: 'testError' }, console.log);
   ```

3. **Verify in Sentry:**
   - Go to https://sentry.io/organizations/YOUR_ORG/issues/
   - Should see error event within 30 seconds
   - Check that PII is stripped (no API keys, user text visible)

---

## Privacy Configuration

**What Sentry Captures:**
- Error type and message
- Stack trace (file/line/function)
- Browser version and OS
- Extension version
- Component context (background/content/popup)
- Site where error occurred (chat.openai.com, etc.)
- Scan performance metrics (duration in ms)

**What Sentry DOES NOT Capture:**
- ❌ User text being scanned
- ❌ API keys
- ❌ Prompts or conversations
- ❌ User email addresses
- ❌ Personally identifiable information
- ❌ Browsing history
- ❌ Extension configuration (except enabled/disabled state)

**PII Stripping Patterns:**
- OpenAI keys: `sk-[...]` → `sk-REDACTED`
- GitHub tokens: `ghp_[...]` → `ghp_REDACTED`
- AWS keys: `AKIA[...]` → `AKIA_REDACTED`
- Emails: `user@domain.com` → `email@REDACTED`
- JWT tokens: `eyJ[...]` → `JWT_REDACTED`

---

## Monitoring Dashboard

Once Sentry is live, you'll have access to:

**Real-Time Alerts:**
- Error rate spikes (>10 errors/minute)
- New error types (first occurrence)
- Regression detection (errors that were fixed, now back)

**Metrics:**
- Total errors per day/week
- Error rate per user (anonymized)
- Crash-free rate (% of users with zero errors)
- Performance: Scan duration percentiles (p50, p95, p99)

**Debugging Context:**
- Full stack traces
- Breadcrumb trail (last 20 actions before error)
- Browser/OS distribution
- Extension version distribution
- Site-specific error rates (ChatGPT vs Claude vs Gemini)

---

## Error Severity Classification

**Critical (P0):**
- Extension fails to load
- All scans failing (100% error rate)
- Data loss (storage corruption)

**High (P1):**
- Scan failures on one platform (e.g., ChatGPT works, Claude broken)
- Performance degradation (>5s scans)
- Badge/UI not updating

**Medium (P2):**
- Occasional timeout errors (<5% of scans)
- Slow scans (1-3s)
- Non-critical UI glitches

**Low (P3):**
- Cosmetic issues
- Edge case errors (<0.1% occurrence)

---

## Alert Rules (To Configure in Sentry)

**Rule 1: Critical Error Rate**
- **Condition:** Error rate > 10/minute for 5 minutes
- **Action:** Slack notification + email to eng@hozyne.com
- **Severity:** P0

**Rule 2: New Error Type**
- **Condition:** First occurrence of any new error
- **Action:** Slack notification
- **Severity:** P1

**Rule 3: Slow Scan Alert**
- **Condition:** >10 scans taking >3 seconds in 1 hour
- **Action:** Slack notification
- **Severity:** P2

**Rule 4: Chrome Store Rejection Signal**
- **Condition:** "Extension context invalidated" errors spike
- **Action:** Email alert (likely Chrome Web Store rejection)
- **Severity:** P0

---

## Next Steps

1. **[Action Required]** Create Sentry account + project (5 min)
2. **[Action Required]** Add Sentry DSN to `.env` file
3. **[Automated]** OpenBak will complete integration once DSN is provided
4. **[Testing]** Trigger test error, verify Sentry dashboard
5. **[Production]** Deploy to Chrome Web Store with Sentry enabled

**Estimated Time to Production:** 30 minutes

**Blocker:** Sentry DSN needed (create account first)

---

## Cost Projections

**Free Tier (Current):**
- 5,000 events/month
- 1 project
- 7 days data retention
- **Sufficient for:** 0-100 users

**Team Tier ($26/month):**
- 50,000 events/month
- Unlimited projects
- 90 days data retention
- **Upgrade when:** >100 active users

**Business Tier ($80/month):**
- 100,000 events/month
- Priority support
- Custom data retention
- **Upgrade when:** >1,000 active users

---

**Ready to activate once Sentry DSN is provided!**
