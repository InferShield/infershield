# InferShield Browser Extension

**Protect yourself from accidentally sharing sensitive information in AI chats.**

Works with ChatGPT, Claude, Gemini, and GitHub Copilot.

---

## Features

✅ **Real-time PII Detection** - Scans your messages before sending  
✅ **15+ Threat Patterns** - API keys, SSN, emails, credit cards, etc.  
✅ **Interactive Warnings** - Choose: Cancel, Redact, or Send Anyway  
✅ **Multi-Platform** - ChatGPT, Claude, Gemini, GitHub Copilot  
✅ **Privacy-First** - Your messages are never stored  
✅ **Open Source** - Audit the code yourself  

---

## Installation

### Option 1: Load Unpacked (For Testing)

**Chrome/Edge:**
1. Go to: `chrome://extensions`
2. Enable **"Developer mode"** (top right)
3. Click **"Load unpacked"**
4. Select the `extension/` folder
5. Extension icon appears in toolbar!

**Firefox:**
1. Go to: `about:debugging#/runtime/this-firefox`
2. Click **"Load Temporary Add-on"**
3. Select `manifest.json` in the `extension/` folder
4. Extension loaded!

### Option 2: From Web Store (Coming Soon)

- Chrome Web Store: (pending review)
- Firefox Add-ons: (pending review)

---

## Setup

### 1. Deploy Backend (Required)

The extension needs a backend API to scan messages.

**Quick Deploy to Railway (5 minutes):**

1. Go to: https://railway.app
2. Sign up with GitHub
3. Click **"New Project"** → **"Deploy from GitHub"**
4. Select: `InferShield/infershield`
5. Set **Root Directory:** `backend`
6. Add PostgreSQL database
7. Add environment variables (see `RAILWAY_DEPLOY.md`)
8. Deploy!

You'll get a URL like: `https://infershield-production.up.railway.app`

---

### 2. Get API Key

1. Open your backend URL: `https://your-backend.railway.app/signup.html`
2. Create an account
3. Go to dashboard → **API Keys**
4. Click **"Create New Key"**
5. Copy the key (starts with `isk_live_...`)

---

### 3. Configure Extension

1. Click the **InferShield icon** in your browser toolbar
2. Enter your **API Endpoint:** `https://your-backend.railway.app`
3. Enter your **API Key:** `isk_live_...`
4. Choose **Protection Mode:** Warn (recommended)
5. Enable sites you want to protect
6. Click **"Save Settings"**

✅ **You're protected!**

---

## How It Works

1. **You type a message** in ChatGPT/Claude/Gemini/Copilot
2. **Before sending**, InferShield scans the text
3. **If PII detected**, a modal appears showing:
   - Risk score (0-100)
   - Threats found (API key, email, etc.)
   - Options: Cancel | Redact & Send | Send Anyway
4. **You choose** what to do
5. **Message sent** (or not, based on your choice)

---

## Supported Platforms

| Platform | URL | Status |
|----------|-----|--------|
| ChatGPT | chat.openai.com | ✅ Working |
| Claude | claude.ai | ✅ Working |
| Gemini | gemini.google.com | ✅ Working |
| GitHub Copilot | github.com/copilot | ✅ Working |

**Want more platforms?** [Request here](https://github.com/InferShield/infershield/issues)

---

## What Gets Detected

**Credentials:**
- OpenAI API keys (`sk-*`)
- Anthropic API keys (`sk-ant-*`)
- GitHub tokens (`ghp_*`, `github_pat_*`)
- AWS keys (`AKIA*`)
- Generic API keys (32+ chars)

**Personal Info (PII):**
- Email addresses
- Social Security Numbers (US)
- Credit card numbers (Luhn validated)
- Phone numbers (US)
- IP addresses
- Dates of birth

**Government IDs:**
- Passport numbers
- Driver's licenses
- Medical record numbers

**And more!** See [PII Detection docs](https://github.com/InferShield/infershield#pii-detection)

---

## Privacy

**Your data is protected:**
- ✅ Messages scanned in real-time (< 100ms)
- ✅ **NOT stored** in any database
- ✅ **NOT logged** to disk
- ✅ Immediately discarded after scan
- ✅ Open source - audit the code yourself

**Self-hosting option:**
- Host your own backend
- Your data never leaves your infrastructure
- Full control

Read our [Privacy Policy](https://github.com/InferShield/infershield/blob/main/PRIVACY_POLICY.md)

---

## Troubleshooting

### Extension not working?

**Check:**
1. Extension enabled? (chrome://extensions)
2. Backend deployed and running?
3. API key configured correctly?
4. Site enabled in settings?

**Test API:**
```bash
curl https://your-backend.railway.app/health
```

Should return: `{"status":"ok"}`

---

### Modal not appearing?

**Try:**
1. Refresh the chat page
2. Check browser console (F12) for errors
3. Verify extension has permissions
4. Disable other extensions (conflicts?)

---

### "API error" or "Connection refused"?

**Fixes:**
1. Check backend is running
2. Verify API endpoint URL (no trailing slash)
3. Check API key is correct
4. Check browser console for details

---

## Development

### Local Testing

1. **Clone repo:**
   ```bash
   git clone https://github.com/InferShield/infershield.git
   cd infershield/extension
   ```

2. **Run backend locally:**
   ```bash
   cd ../backend
   npm install
   npm start
   # Runs on http://localhost:5000
   ```

3. **Load extension:**
   - Chrome: Load `extension/` folder
   - Set API endpoint: `http://localhost:5000`

4. **Test:**
   - Open ChatGPT
   - Type: `const key = "sk-1234567890abcdef1234567890"`
   - Hit Enter
   - Modal should appear!

---

### Project Structure

```
extension/
├── manifest.json          # Extension config
├── background.js          # Service worker (API calls)
├── content-script.js      # Injected into chat pages
├── popup.html             # Settings UI
├── popup.js               # Settings logic
├── styles/
│   └── inject.css         # Modal styles
└── icons/
    ├── icon16.png         # Toolbar icon
    ├── icon48.png         # Medium icon
    └── icon128.png        # Large icon
```

---

### Building for Production

1. **Create icons:** (see `icons/README.md`)

2. **Update manifest:**
   - Set correct version
   - Update description
   - Add any new permissions

3. **Test thoroughly:**
   - All 4 platforms (ChatGPT, Claude, Gemini, Copilot)
   - Different scenarios (PII, no PII, errors)
   - Edge cases (long messages, special chars)

4. **Package:**
   ```bash
   cd extension
   zip -r infershield-extension-v0.8.0.zip . -x "*.md" "*.DS_Store"
   ```

5. **Submit to stores:**
   - Chrome Web Store
   - Firefox Add-ons

---

## Contributing

**Found a bug?** [Open an issue](https://github.com/InferShield/infershield/issues)

**Want to add a platform?** [Submit a PR](https://github.com/InferShield/infershield/pulls)

**Need help?** [Join Discord](#) (coming soon)

---

## License

MIT License - see [LICENSE](https://github.com/InferShield/infershield/blob/main/LICENSE)

**Open source and free forever.** ❤️

---

## Credits

**Built by:** HoZyne Inc  
**Contributors:** Alex Hosein, OpenBak (AI Assistant)  
**Inspired by:** Privacy-first design principles  

**Star us on GitHub:** ⭐ https://github.com/InferShield/infershield

---

**Questions?** Email: support@hozyne.com
