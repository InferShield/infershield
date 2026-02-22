# InferShield Dashboard (Frontend)

**Customer-facing self-service dashboard for InferShield.**

This is the frontend UI for managing API keys, viewing usage, and handling billing. Built with vanilla HTML/CSS/JS to keep it simple and self-hostable.

---

## 📁 Structure

```
frontend/
├── login.html          # Login page
├── signup.html         # Registration page
├── dashboard.html      # Main dashboard
└── assets/
    ├── css/
    │   └── main.css    # All styles (terminal aesthetic)
    ├── js/
    │   ├── matrix.js   # Background animation
    │   ├── auth.js     # Login/signup logic
    │   └── dashboard.js # Dashboard functionality
    └── images/         # (reserved for future assets)
```

---

## 🎨 Design System

**Terminal Aesthetic:**
- Dark background (#0a0e27)
- Cyan accents (#00d9ff)
- Matrix rain animation
- Monospace font (Courier New)
- Terminal-style boxes with colored dots
- Scanline effects

Matches the marketing site (`docs/`) for brand consistency.

---

## 🔗 API Integration

**Backend endpoints used:**

### Auth
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PUT /api/auth/me` - Update profile
- `POST /api/auth/change-password` - Change password

### API Keys
- `GET /api/keys` - List keys
- `POST /api/keys` - Create key
- `DELETE /api/keys/:id` - Revoke key

### Usage
- `GET /api/usage/current` - Current month usage + quota
- `GET /api/usage/daily` - Daily breakdown

### Billing
- `POST /api/billing/checkout` - Create Stripe checkout
- `POST /api/billing/portal` - Get customer portal URL
- `GET /api/billing/subscription` - Get subscription details

---

## 🚀 Development

**Local development:**

1. Start backend:
   ```bash
   cd backend
   npm start  # Runs on localhost:5000
   ```

2. Serve frontend (any static server):
   ```bash
   cd frontend
   python3 -m http.server 8080
   # OR
   npx serve .
   ```

3. Open http://localhost:8080

**API Base URL:**
- Local: `http://localhost:5000/api`
- Production: `/api` (proxied through same domain)

---

## 🔐 Authentication

**JWT-based auth:**
- Token stored in localStorage as `infershield_token`
- Sent in `Authorization: Bearer <token>` header
- 401 responses redirect to login

**Flow:**
1. User signs up → Stripe customer created → JWT issued
2. Token stored client-side
3. All dashboard requests include token
4. Expired/invalid tokens → redirect to login

---

## 📊 Dashboard Features

### Overview
- Monthly request count
- Quota usage (percentage)
- PII detections count
- Progress bar with color coding (green/yellow/red)

### API Keys
- List all keys (active/expired)
- Create new keys (shown once!)
- Revoke keys
- View usage per key

### Usage
- Daily request breakdown
- PII detection stats
- Historical data

### Billing
- Current plan display
- Upgrade button (if on free)
- Stripe customer portal link (if subscribed)
- Renewal date

### Account
- Update name/company
- Change password
- Email (read-only)

---

## 🔧 Configuration

**Environment-specific:**
- API base URL detected automatically (localhost vs production)
- Stripe checkout redirects to current domain
- All API calls go through backend (no direct Stripe from frontend)

---

## 📱 Responsive Design

**Breakpoints:**
- Desktop: Full sidebar + main content
- Tablet (< 768px): Smaller sidebar
- Mobile (< 600px): Stacked layout, collapsible sidebar

---

## 🎯 Self-Hosting Notes

**For self-hosters:**
1. This dashboard is open source (MIT licensed)
2. Customize styles in `assets/css/main.css`
3. Add your own branding/logo
4. Backend API must be accessible at `/api` or configure `API_BASE` in JS files

**Optional customizations:**
- Change color scheme (replace #00d9ff with your brand color)
- Replace ASCII logo in sidebar
- Add custom analytics
- Modify plan limits display

---

## 🔜 Future Enhancements (Post-v1.0)

- [ ] Dark/light mode toggle
- [ ] Usage charts (Chart.js or similar)
- [ ] API key scoping (permissions)
- [ ] Team management (multiple users per account)
- [ ] Webhooks management
- [ ] Email notification preferences
- [ ] 2FA setup

---

## 🐛 Known Issues

None yet! Report issues at: https://github.com/InferShield/infershield/issues

---

## 📄 License

MIT - Same as the rest of InferShield.

Built with ❤️ by HoZyne Inc.
