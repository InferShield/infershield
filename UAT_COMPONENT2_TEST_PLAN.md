# InferShield Chrome Extension Component 2 UAT Test Plan
## User Acceptance Testing: Threat Detection & Popup Alerts

**Product:** prod_infershield_001 (InferShield)  
**Component:** Chrome Extension Component 2 - Threat Detection & Popup Alert UX  
**UAT Lead:** OpenBak (Enterprise Orchestrator - UAT Agent)  
**Date:** 2026-03-04  
**Version:** v0.8.1  

---

## 1. Executive Summary

This UAT validates the core security functionality of the InferShield Chrome Extension:
- **Threat Detection Accuracy**: Does the extension correctly identify sensitive information (PII, API keys, credentials)?
- **Popup Alert UX**: Is the warning modal clear, informative, and actionable?
- **User Experience**: Can users easily understand threats and make informed decisions?
- **Platform Coverage**: Does it work across ChatGPT, Claude, Gemini, and GitHub Copilot?

---

## 2. Test Environment

### 2.1 Infrastructure
- **Browser**: Chrome/Chromium (Developer Mode, extensions enabled)
- **Extension Version**: 0.8.1
- **Backend API**: Local instance (http://localhost:5000)
- **Database**: SQLite (test.db)
- **Node Environment**: NODE_ENV=test

### 2.2 Test Data Sources
- Extension manifest: `/extension/manifest.json`
- Content script: `/extension/content-script.js`
- Background worker: `/extension/background.js`
- Popup UI: `/extension/popup.html`, `/extension/popup.js`
- Modal styles: `/extension/styles/inject.css`

---

## 3. Test Scenarios

### 3.1 Threat Detection Accuracy

#### TC-UAT-001: API Key Detection (OpenAI)
**Given**: User types a message containing an OpenAI API key  
**When**: User attempts to send the message  
**Then**: Extension should:
- Intercept the send action
- Display threat modal
- Show risk score >= 70
- Highlight the API key pattern
- Offer: Cancel | Redact & Send | Send Anyway

**Test Input**:
```
Please analyze this code:
const client = new OpenAI({ apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef' });
```

**Expected Threat**: API_KEY_OPENAI, severity: CRITICAL, risk_score: 95+

---

#### TC-UAT-002: Email Address Detection
**Given**: User types a message containing an email address  
**When**: User attempts to send  
**Then**: Extension should detect PII (email)

**Test Input**:
```
Contact me at john.doe@company.com for more details.
```

**Expected Threat**: EMAIL_ADDRESS, severity: MEDIUM, risk_score: 40-60

---

#### TC-UAT-003: Social Security Number Detection
**Given**: User types a message containing an SSN  
**When**: User attempts to send  
**Then**: Extension should detect PII (SSN)

**Test Input**:
```
My SSN is 123-45-6789, please verify my identity.
```

**Expected Threat**: SSN_US, severity: CRITICAL, risk_score: 95+

---

#### TC-UAT-004: Credit Card Number Detection
**Given**: User types a message containing a credit card number  
**When**: User attempts to send  
**Then**: Extension should detect PII (credit card)

**Test Input**:
```
Card: 4532 1488 0343 6467, exp 12/25, CVV 123
```

**Expected Threat**: CREDIT_CARD, severity: CRITICAL, risk_score: 95+

---

#### TC-UAT-005: Multiple Threats Detection
**Given**: User types a message containing multiple sensitive items  
**When**: User attempts to send  
**Then**: Extension should detect ALL threats and display them in modal

**Test Input**:
```
Hi, I'm debugging an issue. Here's my info:
- Email: admin@example.com
- API Key: sk-1234567890abcdef
- Phone: (555) 123-4567
- IP: 192.168.1.100
```

**Expected Threats**: EMAIL_ADDRESS, API_KEY, PHONE_US, IP_ADDRESS  
**Expected Risk Score**: 80+

---

#### TC-UAT-006: Safe Message (No Threats)
**Given**: User types a normal, safe message  
**When**: User attempts to send  
**Then**: Extension should allow message without modal

**Test Input**:
```
What's the best way to implement authentication in a Node.js app?
```

**Expected**: No modal, message sends immediately

---

### 3.2 Popup Alert UX

#### TC-UAT-007: Modal Clarity - Threat Information
**Given**: A threat is detected  
**When**: Modal is displayed  
**Then**: Modal should clearly show:
- ⚠️ Warning icon/title
- Risk score (numeric, 0-100)
- Risk score color coding (green/yellow/red)
- List of detected threats
- Severity badges (CRITICAL/HIGH/MEDIUM/LOW)
- Pattern names (readable, e.g., "OpenAI API Key")
- Matched text snippets (partially redacted)

**Visual Requirements**:
- High contrast (readable on dark/light backgrounds)
- Clear typography (legible font sizes)
- Visual hierarchy (important info stands out)

---

#### TC-UAT-008: Modal Actions - User Choice
**Given**: Modal is displayed with detected threats  
**When**: User interacts with action buttons  
**Then**: 
- **Cancel Button**: Closes modal, prevents send, clears input (optional)
- **Redact & Send Button**: Replaces sensitive data with [REDACTED], sends message
- **Send Anyway Button**: Sends original message (with user acknowledgment)

**Validation**:
- All buttons are clickable
- Actions execute correctly
- No double-send bug
- Modal closes after action

---

#### TC-UAT-009: Redaction Accuracy
**Given**: User clicks "Redact & Send"  
**When**: Message is redacted  
**Then**: 
- Sensitive data replaced with [REDACTED] or similar
- Non-sensitive text preserved
- Message remains coherent
- Redacted message sent to chat

**Test Input**: (TC-UAT-001 input)  
**Expected Output**:
```
Please analyze this code:
const client = new OpenAI({ apiKey: '[REDACTED_API_KEY]' });
```

---

#### TC-UAT-010: Modal Responsiveness
**Given**: Extension runs on different screen sizes  
**When**: Modal is displayed  
**Then**: 
- Modal is centered on screen
- Content is readable (no overflow)
- Buttons are accessible
- Works on 1920x1080, 1366x768, 1024x768

---

### 3.3 Platform-Specific Tests

#### TC-UAT-011: ChatGPT Integration (chat.openai.com)
**Given**: User is on ChatGPT interface  
**When**: User types sensitive info and presses Enter or clicks Send  
**Then**: Extension intercepts and shows modal

**Test Actions**:
1. Navigate to https://chat.openai.com
2. Type test input (TC-UAT-001)
3. Press Enter
4. Verify modal appears
5. Test "Cancel" button
6. Type again, test "Redact & Send"
7. Verify redacted message sent

---

#### TC-UAT-012: Claude Integration (claude.ai)
**Given**: User is on Claude interface  
**When**: User types sensitive info and sends  
**Then**: Extension intercepts and shows modal

**Test Actions**: (Same as TC-UAT-011, different URL)

---

#### TC-UAT-013: Gemini Integration (gemini.google.com)
**Given**: User is on Gemini interface  
**When**: User types sensitive info and sends  
**Then**: Extension intercepts and shows modal

**Test Actions**: (Same as TC-UAT-011, different URL)

---

#### TC-UAT-014: GitHub Copilot Integration (github.com/copilot)
**Given**: User is on GitHub Copilot chat  
**When**: User types sensitive info and sends  
**Then**: Extension intercepts and shows modal

**Test Actions**: (Same as TC-UAT-011, different URL)

---

### 3.4 Configuration & Settings

#### TC-UAT-015: Extension Popup Configuration
**Given**: User clicks extension icon  
**When**: Popup opens  
**Then**: User should see:
- API Endpoint input (pre-filled or empty)
- API Key input (masked)
- Protection Mode dropdown (Warn/Block)
- Site toggles (ChatGPT, Claude, Gemini, GitHub)
- Enable/Disable master switch
- Save button

**Actions**:
1. Click extension icon
2. Verify all fields present
3. Enter test API endpoint: http://localhost:5000
4. Enter test API key: test-key-12345
5. Select "Warn" mode
6. Toggle all sites ON
7. Click Save
8. Verify success message

---

#### TC-UAT-016: Site-Specific Enable/Disable
**Given**: User disables ChatGPT in settings  
**When**: User visits ChatGPT  
**Then**: Extension should NOT intercept messages

**Test Actions**:
1. Open popup, disable ChatGPT
2. Save settings
3. Visit chat.openai.com
4. Type sensitive info
5. Verify NO modal appears (extension inactive)

---

#### TC-UAT-017: Protection Mode - Warn vs Block
**Given**: User changes protection mode  
**When**: Threat is detected  
**Then**: 
- **Warn Mode**: Shows modal with all options (Cancel/Redact/Send)
- **Block Mode**: Shows modal, auto-blocks (no "Send Anyway" option)

**Test Actions**:
1. Set mode to "Warn", test threat (should see all 3 buttons)
2. Set mode to "Block", test threat (should only see Cancel/Redact)

---

### 3.5 Error Handling & Edge Cases

#### TC-UAT-018: Backend Unavailable
**Given**: Backend API is offline/unreachable  
**When**: User attempts to send message  
**Then**: Extension should:
- Display error modal
- Show clear error message ("Backend unavailable")
- Prevent send (fail-safe)
- Suggest checking configuration

---

#### TC-UAT-019: Invalid API Key
**Given**: User configures invalid/expired API key  
**When**: Extension attempts to scan  
**Then**: Extension should show error message

---

#### TC-UAT-020: Empty Message Send
**Given**: User attempts to send empty message  
**When**: Send is triggered  
**Then**: Extension should NOT intercept (no content to scan)

---

#### TC-UAT-021: Very Long Message
**Given**: User types a 5000+ character message with threats  
**When**: Send is triggered  
**Then**: 
- Extension should scan successfully
- Modal should display (scrollable threat list if needed)
- No performance degradation

---

#### TC-UAT-022: Special Characters & Encoding
**Given**: Message contains emojis, unicode, special chars  
**When**: Scan is performed  
**Then**: Extension should handle gracefully (no crashes)

**Test Input**:
```
🔑 API Key: sk-test-😎-abcdef123456 ✨
Contact: josé@example.com 🚀
```

---

#### TC-UAT-023: Rapid Send Prevention (Bypass Flag)
**Given**: User clicks "Redact & Send"  
**When**: Redacted message is sent  
**Then**: 
- Extension should NOT intercept the redacted send (bypass flag)
- No infinite loop
- Message sends once

**Validation**: Check `bypassNextScan` flag logic in content-script.js

---

### 3.6 Performance & Reliability

#### TC-UAT-024: Scan Latency
**Given**: User sends a message with threats  
**When**: Scan is performed  
**Then**: 
- Modal should appear within 500ms
- No noticeable delay
- Scanning indicator shown briefly

---

#### TC-UAT-025: Extension Reload Recovery
**Given**: Extension is reloaded/updated while user is on chat page  
**When**: User attempts to send  
**Then**: Extension should:
- Show error: "Extension was updated, reload page"
- Fail-safe (prevent send)

---

#### TC-UAT-026: Multiple Tab Support
**Given**: User has ChatGPT open in 3 tabs  
**When**: User sends messages in different tabs  
**Then**: Each tab should function independently (no state collision)

---

## 4. Acceptance Criteria

### Must Pass (Blockers):
- ✅ TC-UAT-001, TC-UAT-003, TC-UAT-004 (Critical PII detection)
- ✅ TC-UAT-006 (Safe message passthrough)
- ✅ TC-UAT-008 (Modal action buttons work)
- ✅ TC-UAT-011 (ChatGPT integration works)
- ✅ TC-UAT-015 (Popup configuration works)
- ✅ TC-UAT-018 (Graceful error handling)

### Should Pass (High Priority):
- ✅ TC-UAT-002, TC-UAT-005 (Multiple threat detection)
- ✅ TC-UAT-007 (Modal clarity)
- ✅ TC-UAT-009 (Redaction accuracy)
- ✅ TC-UAT-012, TC-UAT-013, TC-UAT-014 (All platforms work)

### Nice to Have (Medium Priority):
- ✅ TC-UAT-010 (Responsive design)
- ✅ TC-UAT-016, TC-UAT-017 (Configuration options)
- ✅ TC-UAT-024 (Performance)

---

## 5. Test Execution

### Execution Method:
1. **Manual Testing**: Load extension in Chrome, visit each platform, execute test cases
2. **Automated Checks**: Use browser automation (Playwright/Puppeteer) for regression
3. **Screenshot Evidence**: Capture modals, threat lists, redacted outputs
4. **Log Review**: Check browser console for errors, warnings

### Test Data:
- Prepared test messages for each threat type
- Valid/invalid API keys
- Fake PII data (non-real SSN, credit cards)

### Tools:
- Chrome DevTools (console, network, storage)
- Extension Reloader (for quick iterations)
- Screenshot capture tool

---

## 6. Results Summary Template

```markdown
### Test Execution Results

**Date**: [DATE]
**Tester**: [NAME]
**Extension Version**: 0.8.1
**Backend Version**: [VERSION]

#### Pass/Fail Summary
- **Total Test Cases**: 26
- **Passed**: X
- **Failed**: Y
- **Blocked**: Z
- **Pass Rate**: X%

#### Critical Findings
1. [Issue 1]
2. [Issue 2]

#### Recommendations
- [Recommendation 1]
- [Recommendation 2]

#### Sign-off
- [ ] UAT Lead Approval
- [ ] Product Owner Approval
- [ ] CEO Approval (if required for release gate)
```

---

## 7. Out of Scope

The following are NOT tested in this UAT (separate test plans exist):
- Backend API functionality (covered by integration tests)
- Session tracking logic (covered by unit tests)
- OAuth flows (separate UAT)
- Dashboard UI (separate UAT)
- Firefox/Safari extension variants (future)
- Mobile browser support (future)

---

## 8. References

- Extension source: `/home/openclaw/.openclaw/workspace/infershield/extension/`
- README: `/extension/README.md`
- Manifest: `/extension/manifest.json`
- Content Script: `/extension/content-script.js`
- Background Worker: `/extension/background.js`
- Popup UI: `/extension/popup.html`, `/extension/popup.js`
- Styles: `/extension/styles/inject.css`

---

**Document Version**: 1.0  
**Last Updated**: 2026-03-04 14:30 UTC  
**Next Review**: Post-execution
