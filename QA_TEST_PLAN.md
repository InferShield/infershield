# QA Test Plan - InferShield v0.7.0 Quick Wins
**Build Date:** February 22, 2026  
**Developer:** OpenBak (AI Agent)  
**Estimated Test Time:** 30 minutes  
**Priority:** HIGH (blocking Week 1 launch)

---

## 🎯 What Was Built Tonight

Three major features ready for testing:

1. **Sentry Integration** - Error monitoring (privacy-first)
2. **Onboarding Tour** - 5-step guided tour for new users
3. **Demo Mode** - One-click "Try Example" trial experience

---

## 🧪 Test Environment Setup

### Prerequisites:
```bash
# 1. Pull latest code
cd ~/.openclaw/workspace/infershield
git pull origin main

# 2. Start backend server
cd backend
npm start
```

**Server URL:** `http://localhost:5000`

### Test Accounts:
- **Existing User:** (your test account credentials)
- **Demo Mode:** No account needed (click "Try Example")

---

## Test Suite 1: Onboarding Tour (10 minutes)

### Setup:
1. Clear localStorage to simulate new user:
   ```javascript
   // Browser DevTools Console
   localStorage.clear()
   ```
2. Login to dashboard with test account

### Test Cases:

#### TC1.1: Tour Auto-Start ✅❌
- **Expected:** Green tooltip appears 1 second after dashboard loads
- **Steps:**
  1. Login with test account
  2. Wait 1-2 seconds
- **Pass Criteria:** Welcome tooltip appears with "Start Tour" button
- **Screenshot if fail:** [Attach]

#### TC1.2: Tour Navigation ✅❌
- **Expected:** User can navigate through all 5 steps
- **Steps:**
  1. Click "Start Tour"
  2. Click "Next" on each step
  3. Verify each step highlights correct dashboard element
- **Pass Criteria:** 
  - Step 1: Welcome message
  - Step 2: Dashboard stats highlighted
  - Step 3: "API Keys" nav item highlighted
  - Step 4: "Usage" nav item highlighted
  - Step 5: Final checklist
- **Screenshot if fail:** [Attach]

#### TC1.3: Tour Skip ✅❌
- **Expected:** User can skip tour, and it won't show again
- **Steps:**
  1. Clear localStorage, login
  2. Click "Skip Tour"
  3. Refresh page
- **Pass Criteria:** Tour does NOT auto-start on refresh
- **Screenshot if fail:** [Attach]

#### TC1.4: Tour Restart ✅❌
- **Expected:** User can manually restart tour
- **Steps:**
  1. Complete or skip tour
  2. Click "? Restart Tour" button in sidebar (bottom-left)
- **Pass Criteria:** Tour starts from Step 1
- **Screenshot if fail:** [Attach]

#### TC1.5: Mobile Responsiveness ✅❌
- **Expected:** Tour works on mobile screens
- **Steps:**
  1. Resize browser to 375px width
  2. Trigger tour
- **Pass Criteria:** 
  - Tooltip fits on screen
  - Buttons stack vertically
  - Text is readable
- **Screenshot if fail:** [Attach]

### Known Issues:
- Tour may not appear if JavaScript errors exist
- Shepherd.js library must load from CDN (check Network tab)

---

## Test Suite 2: Demo Mode (10 minutes)

### Setup:
- Logout or open incognito window
- Navigate to `http://localhost:5000/login.html`

### Test Cases:

#### TC2.1: "Try Example" Button Visibility ✅❌
- **Expected:** Button appears on login and signup pages
- **Steps:**
  1. Check login page
  2. Check signup page
- **Pass Criteria:** 
  - "🎭 TRY EXAMPLE" button visible below form
  - Button has green/orange styling
  - Hint text: "Explore with sample data - no account needed"
- **Screenshot if fail:** [Attach]

#### TC2.2: Demo Mode Activation ✅❌
- **Expected:** Clicking "Try Example" redirects to dashboard
- **Steps:**
  1. Click "🎭 TRY EXAMPLE" on login page
- **Pass Criteria:**
  - Redirects to `/dashboard.html`
  - Orange banner appears at top: "🎭 DEMO MODE"
  - Dashboard shows sample data (not empty)
- **Screenshot if fail:** [Attach]

#### TC2.3: Demo Data Display ✅❌
- **Expected:** All dashboard sections show realistic sample data
- **Steps:**
  1. Activate demo mode
  2. Check each section: Overview, API Keys, Usage, Billing, Account
- **Pass Criteria:**
  - **Overview:** 487 requests, 23 PII detections shown
  - **API Keys:** 2 keys listed (Production + Development)
  - **Usage:** Usage chart/data visible
  - **Billing:** PRO plan, $99/mo shown
  - **Account:** Demo User email shown
- **Screenshot if fail:** [Attach section name]

#### TC2.4: Demo Mode Persistence ✅❌
- **Expected:** Demo mode survives page refresh
- **Steps:**
  1. Activate demo mode
  2. Refresh page (F5)
- **Pass Criteria:** Orange banner still visible, data still loaded
- **Screenshot if fail:** [Attach]

#### TC2.5: Demo Mode Exit ✅❌
- **Expected:** User can exit demo mode
- **Steps:**
  1. Activate demo mode
  2. Click "Exit Demo" link in orange banner
- **Pass Criteria:** 
  - Redirects to login page
  - No orange banner on login page
  - Demo mode flag cleared (check localStorage)
- **Screenshot if fail:** [Attach]

#### TC2.6: Sign Up from Demo ✅❌
- **Expected:** User can sign up from demo mode
- **Steps:**
  1. Activate demo mode
  2. Click "Sign Up" link in orange banner
- **Pass Criteria:** Redirects to signup page
- **Screenshot if fail:** [Attach]

### Known Issues:
- Mock data must load from `/assets/mock/demo-data.json`
- If JSON fails to load, dashboard may be empty

---

## Test Suite 3: Sentry Integration (5 minutes)

### Setup:
- Sentry DSN already configured: `https://56fd71c2883661c251841841d02ece8d@o4510930403065856.ingest.us.sentry.io/4510930409357312`

### Test Cases:

#### TC3.1: Extension Loads Without Errors ✅❌
- **Expected:** No JavaScript errors in console
- **Steps:**
  1. Open Chrome DevTools Console
  2. Load extension in Chrome (`chrome://extensions`)
  3. Check console for errors
- **Pass Criteria:** 
  - Console shows: `[InferShield] Sentry initialized successfully`
  - No red error messages
- **Screenshot if fail:** [Attach console]

#### TC3.2: Error Tracking (Optional) ✅❌
- **Expected:** Errors are captured and sent to Sentry
- **Steps:**
  1. Open DevTools Console
  2. Trigger test error: `throw new Error('QA test error - ignore')`
  3. Wait 30 seconds
  4. Check Sentry dashboard: https://sentry.io
- **Pass Criteria:** Error appears in Sentry issues list
- **Screenshot if fail:** [Attach Sentry dashboard]

#### TC3.3: PII Stripping ✅❌
- **Expected:** Sensitive data is redacted before sending to Sentry
- **Steps:**
  1. Check any Sentry error event
  2. Look for user text, API keys, emails in error details
- **Pass Criteria:** 
  - No actual API keys visible (should show "sk_REDACTED")
  - No email addresses (should show "email@REDACTED")
  - No user prompts/text
- **Screenshot if fail:** [Attach Sentry event details]

---

## Test Suite 4: Integration Tests (5 minutes)

### Test Cases:

#### TC4.1: Onboarding Tour + Demo Mode ✅❌
- **Expected:** Tour works in demo mode
- **Steps:**
  1. Clear localStorage
  2. Activate demo mode via "Try Example"
  3. Wait for tour to auto-start
- **Pass Criteria:** Tour appears in demo mode (both features work together)
- **Screenshot if fail:** [Attach]

#### TC4.2: Cross-Browser Compatibility ✅❌
- **Expected:** Features work in Chrome, Firefox, Edge
- **Steps:**
  1. Test onboarding tour in each browser
  2. Test demo mode in each browser
- **Pass Criteria:** No visual glitches, all features work
- **Screenshot if fail:** [Attach browser name]

#### TC4.3: Logout from Demo Mode ✅❌
- **Expected:** Logout button works in demo mode
- **Steps:**
  1. Activate demo mode
  2. Click "Logout" in sidebar
- **Pass Criteria:** 
  - Redirects to login page
  - Demo mode deactivated (no banner on re-login)
- **Screenshot if fail:** [Attach]

---

## Bug Report Template

If you find issues, report them in this format:

```markdown
### Bug: [Short Title]
**Severity:** Critical / High / Medium / Low
**Test Case:** TC#.#
**Steps to Reproduce:**
1. Step 1
2. Step 2
3. Step 3

**Expected Result:** [What should happen]
**Actual Result:** [What actually happened]
**Screenshot:** [Attach]
**Browser:** Chrome 120 / Firefox 121 / etc.
**Console Errors:** [Paste any errors]

**Workaround:** [If any]
```

---

## Severity Definitions

- **Critical (P0):** Blocks launch, feature unusable
  - Example: Demo mode crashes dashboard
  - Example: Tour doesn't appear at all
  
- **High (P1):** Major functionality broken
  - Example: Tour skips steps randomly
  - Example: Demo data doesn't load
  
- **Medium (P2):** Minor issues, has workaround
  - Example: Tour tooltip overlaps text
  - Example: Demo banner styling off by 2px
  
- **Low (P3):** Cosmetic issues
  - Example: Button hover color slightly wrong
  - Example: Typo in tour text

---

## Success Criteria

**Ready to Ship if:**
- ✅ Zero P0 (Critical) bugs
- ✅ <3 P1 (High) bugs (documented with workarounds)
- ✅ Onboarding tour completes all 5 steps
- ✅ Demo mode loads data in all sections
- ✅ Sentry captures errors without PII leakage

**Blocked if:**
- ❌ Any P0 bug found
- ❌ Tour doesn't auto-start for new users
- ❌ Demo mode crashes or shows empty dashboard
- ❌ Sentry leaks API keys or user text

---

## QA Sign-Off

**Tester Name:** _________________  
**Test Date:** _________________  
**Test Duration:** _______ minutes  

**Results:**
- Test Cases Passed: _____ / 20
- Bugs Found: _____ (P0: ___ | P1: ___ | P2: ___ | P3: ___)

**Recommendation:**
- [ ] ✅ Ship to production (all tests passed)
- [ ] ⏸️ Hold for fixes (P0/P1 bugs found)
- [ ] 🔄 Retest after fixes

**Notes:**
_______________________________________________________
_______________________________________________________
_______________________________________________________

---

## Contact

**Questions?** Ping OpenBak (AI Agent) or check:
- Build documentation: `/home/openclaw/.openclaw/workspace/infershield/backend/public/`
- Files: `ONBOARDING_TOUR_COMPLETE.md`, `DEMO_MODE_COMPLETE.md`
- Git commits: `git log --oneline -10`

---

**Happy Testing! 🧪**
