# InferShield v0.7.0 Testing Guide

**Complete testing documentation for self-service foundation.**

---

## 🧪 Test Status

### Automated Tests: ✅ PASSING
- **Unit Tests:** 33 passed
- **Test Suites:** 2 (auth.test.js, dashboard.test.js)
- **Run Command:** `npm test` in `frontend/`

**Test Coverage:**
- Token management (localStorage)
- Login/signup API calls
- Dashboard authentication
- API key management
- Usage data loading
- Billing operations
- Account updates
- Form validation
- UI navigation

---

## 🔧 Test Environment Setup

### Option A: Docker + Postgres (Recommended)

```bash
# 1. Start Postgres container
docker run -d \
  --name infershield-db \
  -e POSTGRES_USER=infershield \
  -e POSTGRES_PASSWORD=test_password \
  -e POSTGRES_DB=infershield \
  -p 5432:5432 \
  postgres:15-alpine

# 2. Configure backend
cd backend
cp .env.example .env
# Edit .env:
DATABASE_URL=postgresql://infershield:test_password@localhost:5432/infershield
JWT_SECRET=test_jwt_secret_change_in_production
# Copy Stripe keys from .env.stripe

# 3. Run migrations
npm install
npx knex migrate:latest

# 4. Start backend
npm start  # Runs on http://localhost:5000

# 5. Start frontend (new terminal)
cd ../frontend
npm install
python3 -m http.server 8080  # Or: npx serve .
# Open: http://localhost:8080
```

### Option B: Production Test (Live Database)

```bash
# 1. Deploy backend to production (Railway, Render, Fly.io)
# 2. Update frontend API_BASE in assets/js/{auth,dashboard}.js
# 3. Deploy frontend to GitHub Pages or Netlify
# 4. Test live: https://infershield.io/frontend/
```

---

## ✅ Manual Testing Checklist

### 1. User Registration Flow

**Test Case: Happy Path**
1. Navigate to `signup.html`
2. Fill form:
   - Email: `test@example.com`
   - Name: `Test User`
   - Company: `Test Co` (optional)
   - Password: `testpass123` (8+ chars)
   - Confirm: `testpass123`
3. Click "CREATE ACCOUNT"
4. ✅ Verify:
   - Success message shown
   - Auto-login
   - Redirect to `dashboard.html`
   - Stripe customer created (check Stripe dashboard)

**Test Case: Validation Errors**
1. Try password mismatch → ❌ "Passwords do not match"
2. Try short password (<8 chars) → ❌ HTML5 validation
3. Try existing email → ❌ "Email already exists"
4. Try invalid email format → ❌ HTML5 validation

**Expected Backend Behavior:**
- User created in `users` table
- Password bcrypt-hashed
- Stripe customer created
- JWT token returned

---

### 2. Login Flow

**Test Case: Successful Login**
1. Navigate to `login.html`
2. Enter credentials:
   - Email: `test@example.com`
   - Password: `testpass123`
3. Click "LOGIN"
4. ✅ Verify:
   - Token stored in localStorage
   - Redirect to dashboard
   - Dashboard loads user data

**Test Case: Failed Login**
1. Enter wrong password
2. ✅ Verify: Error message shown
3. Check browser console: No token stored

**Expected Backend Behavior:**
- Password verified with bcrypt
- JWT token issued (7-day expiry)
- User.last_login updated

---

### 3. Dashboard - Overview Section

**Test Case: Load Dashboard**
1. Log in successfully
2. ✅ Verify Overview section displays:
   - Welcome message with user name
   - Current plan badge (FREE/PRO/ENTERPRISE)
   - Total requests this month
   - Quota percentage
   - PII detections count

**Test Case: Quota Display**
1. Make API requests (via curl or Postman)
2. Refresh dashboard
3. ✅ Verify:
   - Request count updated
   - Quota bar color:
     - Green: 0-80%
     - Yellow: 80-100%
     - Red: >100%
   - Message changes: "Within quota" → "Approaching limit" → "Quota exceeded"

**Expected API Calls:**
- `GET /api/auth/me` → user info
- `GET /api/usage/current` → usage + quota

---

### 4. API Keys Management

**Test Case: Create New Key**
1. Navigate to "API Keys" section
2. Click "CREATE NEW KEY"
3. Fill modal:
   - Name: `Production Key`
   - Description: `For production app`
4. Click "CREATE KEY"
5. ✅ Verify:
   - Full key shown once: `isk_live_abc...xyz123`
   - Alert: "Save this now - it won't be shown again!"
   - Key appears in list with prefix: `isk_live_abc••••••••••••`
   - Metadata shown: Created date, Last used (Never), Requests (0), Status (ACTIVE)

**Test Case: Revoke Key**
1. Click "REVOKE" on existing key
2. Confirm dialog
3. ✅ Verify:
   - Key removed from list
   - Confirmation message shown

**Test Case: Key Usage Tracking**
1. Make API request with key: `X-API-Key: isk_live_...`
2. Refresh dashboard
3. ✅ Verify:
   - Last used date updated
   - Request count incremented

**Expected Backend Behavior:**
- Key generated: 32-byte random, `isk_live_` prefix
- Stored bcrypt-hashed in database
- Prefix stored for display (first 11 chars)
- Status tracking: active/expired/revoked

---

### 5. Usage Details

**Test Case: Daily Breakdown**
1. Navigate to "Usage" section
2. ✅ Verify display:
   - List of daily usage for current month
   - Format: `Feb 22, 2026: 50 requests (3 PII)`
   - Most recent at top

**Test Case: No Usage**
1. New account with 0 requests
2. ✅ Verify: "No usage data yet"

**Expected API Call:**
- `GET /api/usage/daily` → array of daily stats

---

### 6. Billing & Subscriptions

**Test Case: Free Plan (No Subscription)**
1. Navigate to "Billing" section
2. ✅ Verify:
   - Current Plan: FREE
   - "UPGRADE PLAN" button visible
   - No subscription details shown
   - "MANAGE SUBSCRIPTION" button hidden

**Test Case: Upgrade to Pro**
1. Click "UPGRADE PLAN"
2. ✅ Verify: Redirected to pricing page (`docs/index.html#pricing`)
3. (In production: Stripe checkout flow)

**Test Case: Active Subscription**
1. Manually create Stripe subscription for test user
2. Trigger webhook: `customer.subscription.created`
3. Reload dashboard
4. ✅ Verify:
   - Current Plan: PRO (or ENTERPRISE)
   - Subscription status: active
   - Renewal date shown
   - "MANAGE SUBSCRIPTION" button visible
   - "UPGRADE PLAN" button hidden

**Test Case: Customer Portal**
1. Click "MANAGE SUBSCRIPTION"
2. ✅ Verify: Redirected to Stripe customer portal
3. Can update payment method
4. Can cancel subscription
5. Webhook `customer.subscription.deleted` → plan downgrades to FREE

**Expected Backend Behavior:**
- `POST /api/billing/checkout` → Stripe checkout session
- `POST /api/billing/portal` → Stripe portal URL
- Webhooks update `users.plan` and `users.status`

---

### 7. Account Settings

**Test Case: Update Profile**
1. Navigate to "Account" section
2. Update name: `Updated Name`
3. Update company: `New Company`
4. Click "SAVE CHANGES"
5. ✅ Verify:
   - Success message
   - Name updated in sidebar/header
   - Reload page → changes persist

**Test Case: Change Password**
1. Enter current password
2. Enter new password (8+ chars)
3. Click "CHANGE PASSWORD"
4. ✅ Verify:
   - Success message
   - Form cleared
   - Can log in with new password

**Test Case: Password Validation**
1. Try wrong current password → ❌ Error
2. Try short new password → ❌ HTML5 validation

**Expected API Calls:**
- `PUT /api/auth/me` → update profile
- `POST /api/auth/change-password` → password change

---

### 8. Authentication & Session Management

**Test Case: Token Expiry**
1. Log in
2. Wait 7 days (or manually expire token in backend)
3. Try to use dashboard
4. ✅ Verify: Redirected to login page

**Test Case: Logout**
1. Click "Logout" in sidebar
2. Confirm dialog
3. ✅ Verify:
   - Token removed from localStorage
   - Redirected to login page
   - Cannot access dashboard without re-login

**Test Case: Direct URL Access (No Token)**
1. Clear localStorage
2. Navigate to `dashboard.html` directly
3. ✅ Verify: Redirected to `login.html`

---

### 9. UI/UX Testing

**Test Case: Responsive Design**
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. ✅ Verify:
   - Sidebar adapts
   - Forms remain usable
   - No horizontal scroll
   - Touch targets adequate (mobile)

**Test Case: Terminal Aesthetic**
1. ✅ Verify consistent styling:
   - Matrix background animation
   - Terminal boxes with colored dots
   - Cyan glow effects
   - Monospace fonts
   - Dark theme (#0a0e27 background)

**Test Case: Loading States**
1. Slow network (throttle in DevTools)
2. ✅ Verify:
   - "Loading..." messages shown
   - Buttons disabled during submission
   - No flash of empty content

---

### 10. Error Handling

**Test Case: Network Errors**
1. Stop backend server
2. Try to log in
3. ✅ Verify: Graceful error message (not raw fetch error)

**Test Case: Invalid Responses**
1. Backend returns 500
2. ✅ Verify: User-friendly error shown

**Test Case: CORS Issues**
1. Frontend on different domain than backend
2. ✅ Verify: CORS headers configured correctly

---

## 🔐 Security Testing

**Test Case: XSS Protection**
1. Try injecting `<script>alert('XSS')</script>` in form fields
2. ✅ Verify: Properly escaped, no script execution

**Test Case: API Key Security**
1. Create API key
2. Check localStorage → ✅ Only JWT token stored, not API key
3. Check network tab → ✅ Full API key never sent to frontend after creation

**Test Case: JWT Security**
1. Check token format → ✅ Valid JWT (3 parts, base64)
2. Decode payload → ✅ Contains: userId, email, exp (no password!)
3. Try using expired token → ❌ 401 response

---

## 🐛 Known Issues

**(None yet! Add any discovered during testing)**

---

## 📊 Test Results Template

```markdown
## Test Run: YYYY-MM-DD

**Tester:** [Your Name]
**Environment:** [Local/Staging/Production]
**Backend Version:** v0.7.0
**Frontend Version:** v0.7.0

### Results

| Test Case                  | Status | Notes |
|----------------------------|--------|-------|
| User Registration          | ✅/❌   |       |
| Login                      | ✅/❌   |       |
| Dashboard Load             | ✅/❌   |       |
| Create API Key             | ✅/❌   |       |
| Revoke API Key             | ✅/❌   |       |
| Usage Tracking             | ✅/❌   |       |
| Billing - Free Plan        | ✅/❌   |       |
| Billing - Upgrade          | ✅/❌   |       |
| Account Update             | ✅/❌   |       |
| Password Change            | ✅/❌   |       |
| Logout                     | ✅/❌   |       |
| Responsive Design          | ✅/❌   |       |

### Issues Found

1. [Issue description]
2. [Issue description]

### Recommendations

- [Recommendation]
```

---

## 🚀 CI/CD Integration

**GitHub Actions (Optional):**

```yaml
# .github/workflows/frontend-test.yml
name: Frontend Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: cd frontend && npm install
      - run: cd frontend && npm test
```

---

## 📝 Next Steps

After v0.7.0 testing complete:

1. ✅ Fix any bugs found
2. ✅ Update CHANGELOG.md
3. ✅ Create GitHub release with notes
4. ✅ Tag version: `git tag v0.7.0 && git push --tags`
5. ✅ Move to v0.8: Documentation & Social Proof

---

**For questions or issues:** https://github.com/InferShield/infershield/issues
