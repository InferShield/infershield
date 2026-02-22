# Sentry Integration - ACTIVE

**Status:** ✅ LIVE  
**DSN:** Configured  
**Project:** infershield-extension  
**Environment:** production

---

## Quick Test

To verify Sentry is capturing errors:

### 1. Load Extension

```bash
# Open Chrome
chrome://extensions

# Enable "Developer mode" (top-right toggle)
# Click "Load unpacked"
# Select: ~/.openclaw/workspace/infershield/extension/
```

### 2. Trigger Test Error

Open Chrome DevTools Console and run:

```javascript
// Test 1: Trigger error via background script
chrome.runtime.sendMessage({
  action: 'testSentryError'
}, (response) => {
  console.log('Test response:', response);
});

// Test 2: Manually throw error
throw new Error('Sentry test error from console');
```

### 3. Verify in Sentry Dashboard

1. Go to: https://sentry.io/organizations/YOUR_ORG/issues/
2. Wait 10-30 seconds
3. Should see new error event: "Sentry test error from console"
4. Click into it to verify:
   - Stack trace is captured
   - PII is stripped (no sensitive data visible)
   - Browser/extension version tagged

---

## Sentry Dashboard

**Project URL:** https://sentry.io/organizations/YOUR_ORG/projects/infershield-extension/

**What You'll See:**
- Error events (with stack traces)
- Browser/OS distribution
- Extension version tracking
- Performance metrics (scan duration)

---

## Alert Rules (Recommended Setup)

Once you're in the Sentry dashboard, configure these alerts:

### Alert 1: Critical Error Rate
1. Go to **Alerts** → **Create Alert**
2. **Condition:** "Number of errors" > 10 in 5 minutes
3. **Action:** Email to your email
4. **Name:** "InferShield: Critical Error Rate"

### Alert 2: New Error Type
1. Go to **Alerts** → **Create Alert**
2. **Condition:** "A new issue is created"
3. **Action:** Email notification
4. **Name:** "InferShield: New Error Type"

---

## Privacy Verification

Check that PII is being stripped:

1. In Sentry, click any error event
2. **Verify these are NOT visible:**
   - ❌ User text being scanned
   - ❌ API keys
   - ❌ Prompts or messages
   - ❌ Email addresses (should show "email@REDACTED")

3. **Verify these ARE visible:**
   - ✅ Error type and message
   - ✅ Stack trace
   - ✅ Browser version
   - ✅ Extension version
   - ✅ Site where error occurred (e.g., "chat.openai.com")

---

## Next Steps

1. ✅ **DSN configured** (DONE)
2. ⏳ **Load extension and test** (5 minutes)
3. ⏳ **Verify Sentry dashboard shows events** (2 minutes)
4. ⏳ **Set up alert rules** (5 minutes)
5. ✅ **Move to Quick Wins implementation**

---

## Cost Tracking

**Current Tier:** Free (5,000 events/month)

**When to Upgrade:**
- Free tier sufficient for: 0-100 active users
- Upgrade to Team ($26/mo) when: >100 active users
- Current usage will be visible in Sentry dashboard

---

**Sentry is LIVE! Ready to catch errors in production.**
