# TODO: After Domain Setup

## ⚠️ DO NOT DO THESE UNTIL DOMAIN IS CONFIGURED

These changes should only be made **AFTER** the custom domain (infershield.io or app.infershield.io) is set up and verified working.

---

## 1. Update Extension Default API Endpoint

**Current state:**
```javascript
// extension/background.js
const DEFAULT_CONFIG = {
  apiEndpoint: 'http://localhost:5000',  // ❌ Only works for developers
  // ...
};
```

**After domain setup:**
```javascript
// extension/background.js
const DEFAULT_CONFIG = {
  apiEndpoint: 'https://infershield.io',  // ✅ Works out of the box for all users
  // ...
};
```

**File to change:** `extension/background.js` (line 7)

**Why this matters:**
- Extension will "just work" after installation (no setup needed!)
- Users don't need to configure API endpoint manually
- Self-hosters can still override in settings if they want

**Testing after change:**
1. Load extension in Chrome
2. Open ChatGPT
3. Type a message with an API key (e.g., `sk-1234567890abcdef`)
4. Should scan and detect threat WITHOUT user configuring anything ✅

---

## 2. Update Extension Popup Default Text

**Current state:**
```javascript
// extension/popup.js (if it shows endpoint config)
// Shows: "http://localhost:5000"
```

**After domain setup:**
```javascript
// Show: "https://infershield.io"
// With note: "Using cloud API. Self-hosters can change this to localhost:5000"
```

---

## 3. Update Documentation

**Files to update:**
- `README.md` → Update quick start (remove manual API endpoint configuration)
- `docs/EXTENSION.md` → Update installation instructions
- `extension/manifest.json` → Bump version to v0.8.0 (self-service ready!)

**Example README changes:**

**Before:**
```markdown
### Quick Start

1. Clone the repo
2. Run the backend: `cd backend && npm start`
3. Load extension in Chrome
4. Configure API endpoint: http://localhost:5000  ← Remove this step!
5. Browse to ChatGPT and start chatting
```

**After:**
```markdown
### Quick Start

1. Install extension from Chrome Web Store (or load unpacked)
2. Browse to ChatGPT and start chatting - it just works! ✅

For self-hosting, see SELF_HOSTING.md
```

---

## 4. Create SELF_HOSTING.md Guide

For users who want to run their own backend instead of using the cloud service:

```markdown
# Self-Hosting InferShield

If you want to run InferShield on your own infrastructure:

## Backend Setup

1. Clone the repo
2. Set up PostgreSQL database
3. Configure environment variables (.env)
4. Run migrations: `npm run migrate`
5. Start server: `npm start`

## Extension Configuration

1. Click the InferShield extension icon
2. Go to Settings
3. Change API Endpoint to: `http://localhost:5000`
4. Save

Now the extension will use your local backend instead of the cloud service.

## Why Self-Host?

- Data never leaves your network
- No usage limits
- Full control over policies and rules
- Audit logs stay private
```

---

## 5. Version Bump Timeline

**Current:** v0.7.3 (browser extension bug fixes)

**Next:** v0.8.0 (self-service ready!)

**Changelog for v0.8.0:**
```markdown
## v0.8.0 - Self-Service Ready (2026-02-XX)

### 🚀 Major Changes
- **Extension now uses cloud API by default** - works out of the box!
- Default API endpoint: https://infershield.io (no configuration needed)
- Usage tracking and quota enforcement enabled
- Dashboard shows real-time usage stats

### ✨ New Features
- Self-service signup at https://infershield.io/signup
- API key generation in dashboard
- Usage tracking (Free: 100/mo, Pro: 10k/mo, Enterprise: unlimited)
- Quota enforcement (returns 429 when limit exceeded)

### 🔧 For Self-Hosters
- Can still override API endpoint in extension settings
- See SELF_HOSTING.md for complete guide

### 🐛 Bug Fixes
- Fixed usage tracking (was stuck at 0/100)
- Fixed quota enforcement (free tier had infinite requests)
- Fixed infinite loop after "Redact & Send"
- Fixed send button interception on ChatGPT
- Fixed CSP violation in error modal

### 📚 Documentation
- Added DOMAIN_SETUP.md (Railway custom domain guide)
- Added SELF_HOSTING.md (for users running their own backend)
- Updated README with simpler quick start

### ⚠️ Breaking Changes
- Extension now requires API key for cloud service (free tier: 100 req/mo)
- Local development still works (set endpoint to localhost:5000)
```

---

## Deployment Checklist

Once domain is confirmed working:

- [ ] Update `extension/background.js` default API endpoint
- [ ] Update `extension/popup.js` (if needed)
- [ ] Create `SELF_HOSTING.md`
- [ ] Update `README.md` (simplify quick start)
- [ ] Update `docs/EXTENSION.md`
- [ ] Bump version to v0.8.0 in `manifest.json`
- [ ] Create release notes (RELEASE_NOTES_v0.8.0.md)
- [ ] Test extension end-to-end with cloud API
- [ ] Test extension with localhost override (self-hosters)
- [ ] Create GitHub release v0.8.0
- [ ] Prepare Chrome Web Store listing (screenshots, description)
- [ ] Submit to Chrome Web Store (if ready)
- [ ] Announce on X/Twitter, Reddit, HN

---

## Current State (Before Domain)

❌ **Do NOT ship extension to public yet!**

Why:
- Default endpoint is `localhost:5000` (only works for developers)
- Users would get "Failed to connect" errors
- Would create bad first impression

✅ **Wait until:**
1. Domain is set up (infershield.io working)
2. Backend deployed and tested with domain
3. Extension updated to use domain
4. End-to-end testing complete
5. Documentation updated

**Then:** Ship v0.8.0 as the first public release! 🚀
