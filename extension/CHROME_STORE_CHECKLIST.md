# InferShield Extension - Chrome Web Store Submission Checklist

## ✅ **Already Complete**

- [x] manifest.json configured
- [x] Background service worker (background.js)
- [x] Content script injection (content-script.js)
- [x] Settings popup UI (popup.html + popup.js)
- [x] Basic icons (16x16, 48x48, 128x128)
- [x] Multi-platform support (ChatGPT, Claude, Gemini, Copilot)
- [x] README documentation
- [x] Default cloud API endpoint configured

---

## 🔧 **Polish Required (Before Chrome Web Store)**

### 1. Icons & Graphics ⚠️
**Current:** Low-quality placeholder PNGs
**Need:**
- [ ] High-quality 128x128 icon (app icon)
- [ ] 440x280 promotional tile image (small)
- [ ] 920x680 promotional tile image (large)
- [ ] 1400x560 marquee promotional image
- [ ] 5 screenshots (1280x800 or 640x400)
  - Screenshot 1: Warning modal on ChatGPT
  - Screenshot 2: Settings page
  - Screenshot 3: API key detection
  - Screenshot 4: Redaction in action
  - Screenshot 5: Dashboard integration

**Tools:** Figma or GIMP for high-quality graphics

---

### 2. Testing ✅ (Needs Verification)
**Test each platform:**
- [ ] ChatGPT (chat.openai.com)
  - Send message with PII → modal appears
  - Click "Cancel" → message not sent
  - Click "Redact & Send" → sends redacted version
  - Click "Send Anyway" → sends original
- [ ] Claude (claude.ai)
  - Same tests as ChatGPT
- [ ] Gemini (gemini.google.com)
  - Same tests as ChatGPT
- [ ] GitHub Copilot (github.com/copilot)
  - Same tests as ChatGPT

**Edge Cases:**
- [ ] No API key configured → show setup message
- [ ] Invalid API key → show error
- [ ] Backend offline → show offline message
- [ ] Very long messages (10k+ chars)
- [ ] Multiple PII types in one message
- [ ] Special characters / emoji

---

### 3. Store Listing Content 📝

**Required Fields:**
- [ ] **App Name:** InferShield - AI Chat PII Protection
- [ ] **Short Description (132 chars):** "Protect yourself from accidentally sharing sensitive info (API keys, SSN, emails) in AI chats. ChatGPT, Claude, Gemini."
- [ ] **Detailed Description (16k chars):**
  - What it does
  - How it works
  - Privacy policy link
  - Setup instructions
  - Supported platforms
- [ ] **Category:** Productivity
- [ ] **Language:** English (add more later)
- [ ] **Privacy Policy URL:** https://infershield.io/privacy (need to create)
- [ ] **Support URL:** https://github.com/InferShield/infershield/issues

**Optional but Recommended:**
- [ ] Demo video (YouTube link)
- [ ] Website: https://infershield.io

---

### 4. Privacy Policy 📋

**Required by Chrome Web Store** if using remote code or collecting data.

**Must Include:**
- What data is collected (text being scanned)
- How it's used (PII detection only)
- Where it's sent (your backend API)
- How long it's stored (not stored, discarded immediately)
- User rights
- Contact information

**Create:** `docs/PRIVACY_POLICY.md` and host at `https://infershield.io/privacy`

---

### 5. Permissions Justification 📋

Chrome Web Store requires explanations for permissions:

**`storage`:** "Store user settings (API key, endpoint, enabled sites)"
**`activeTab`:** "Access the current tab to detect when user is on supported AI chat sites"
**`host_permissions` (chat.openai.com, etc.):** "Inject content script to scan messages before sending on supported AI platforms"

---

### 6. Code Quality 🔍

- [ ] Remove all `console.log` or wrap in `if (DEBUG)` flag
- [ ] Add error boundaries for all API calls
- [ ] Minify production build? (optional)
- [ ] Run linter (ESLint)
- [ ] Security audit (no eval(), no inline scripts)

---

### 7. Legal/Compliance ⚖️

- [ ] Terms of Service
- [ ] Privacy Policy (required)
- [ ] GDPR compliance statement (if targeting EU)
- [ ] Copyright notices
- [ ] MIT License file

---

### 8. Backend Verification ✅

**Ensure backend is ready:**
- [ ] `/api/analyze` endpoint working
- [ ] API key authentication working
- [ ] CORS headers configured for extension
- [ ] Rate limiting in place
- [ ] Error handling for all edge cases
- [ ] Health check endpoint: `/health`

**Test:**
```bash
curl https://app.infershield.io/health
curl -X POST https://app.infershield.io/api/analyze \
  -H "Content-Type: application/json" \
  -H "X-API-Key: isk_live_YOUR_KEY" \
  -d '{"prompt": "My email is test@example.com"}'
```

---

## 📦 **Packaging for Submission**

### Create ZIP File:
```bash
cd /home/openclaw/.openclaw/workspace/infershield/extension
zip -r infershield-extension-v0.8.0.zip . \
  -x "*.md" \
  -x "*.DS_Store" \
  -x "__MACOSX/*" \
  -x ".git/*"
```

### Verify ZIP Contents:
- manifest.json ✅
- background.js ✅
- content-script.js ✅
- popup.html ✅
- popup.js ✅
- styles/ folder ✅
- icons/ folder ✅
- No source maps or dev files ✅

---

## 🚀 **Chrome Web Store Submission Process**

1. **Go to:** https://chrome.google.com/webstore/devconsole
2. **Pay $5 developer fee** (one-time, if not already paid)
3. **Click "New Item"**
4. **Upload ZIP file**
5. **Fill store listing:**
   - Name, description, screenshots
   - Category, language
   - Privacy policy URL
6. **Submit for review**
7. **Wait 1-3 days** for approval

---

## 🎯 **Priority Order**

### Phase 1: Critical (Do First)
1. ✅ Test all 4 platforms end-to-end
2. ⚠️ Create high-quality icons + screenshots
3. 📝 Write privacy policy
4. 📋 Write detailed store description

### Phase 2: Important (Before Submit)
5. 🔍 Code cleanup (remove console.logs)
6. ⚖️ Legal docs (ToS, Privacy)
7. 🧪 Edge case testing
8. 📦 Package ZIP file

### Phase 3: Nice to Have
9. 🎥 Demo video
10. 🌐 Landing page (infershield.io)
11. 📢 Marketing copy

---

## ✅ **When Ready to Submit:**

**Checklist:**
- [ ] All 4 platforms tested and working
- [ ] High-quality graphics created
- [ ] Privacy policy live at https://infershield.io/privacy
- [ ] Store listing text written
- [ ] ZIP file created and tested
- [ ] Developer account ready
- [ ] $5 fee paid (one-time)

**Then:** Submit to Chrome Web Store!

---

## 📊 **Current Status**

**Extension Code:** 90% complete ✅  
**Graphics/Assets:** 10% complete ⚠️  
**Documentation:** 80% complete ✅  
**Legal/Privacy:** 0% complete ❌  
**Testing:** 50% complete ⚠️  

**Estimated Time to Chrome Web Store Ready:** 4-8 hours of focused work

---

## 🤖 **QA Agent Can Help With:**

- End-to-end testing on all 4 platforms
- Screenshot capture
- Edge case testing
- Documentation review

**Want me to spin up QA to test the extension now?** 🦞
