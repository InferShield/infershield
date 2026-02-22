# InferShield FAQ - Frequently Asked Questions

## 🚀 Getting Started

### Q: How do I install InferShield?
**A:** Click "Add to Chrome" on the Chrome Web Store listing. The extension icon will appear in your browser toolbar.

### Q: Do I need an API key?
**A:** Yes. Go to https://app.infershield.io/signup to create a free account and generate an API key. The free tier includes 100 scans/month.

### Q: Can I use InferShield without an account?
**A:** No. InferShield requires a backend API for PII detection. You can either use our cloud service (requires API key) or self-host your own backend (free, open source).

### Q: How do I configure the extension?
**A:**
1. Click the InferShield icon in your toolbar
2. Enter API endpoint: `https://app.infershield.io`
3. Paste your API key
4. Enable the platforms you use (ChatGPT, Claude, etc.)
5. Choose protection mode: Warn (recommended) or Block
6. Click "Save Settings"

---

## 🛡️ How It Works

### Q: Which platforms does InferShield support?
**A:** Currently supported:
- ChatGPT (chat.openai.com)
- Claude (claude.ai)
- Gemini (gemini.google.com)
- GitHub Copilot (github.com/copilot)

We're actively adding more platforms. Request new ones on GitHub!

### Q: What types of sensitive information does it detect?
**A:** InferShield detects 15+ threat types:
- API keys (OpenAI, Anthropic, GitHub, AWS, Generic)
- Email addresses
- Social Security Numbers
- Credit card numbers
- Phone numbers
- IP addresses
- Authentication tokens
- Passport numbers
- Driver's licenses
- Medical record numbers
- Dates of birth
- And more!

### Q: How fast is the scanning?
**A:** Scans complete in under 100ms. You won't notice any delay in your workflow.

### Q: What happens when InferShield detects something?
**A:** A modal appears showing:
- Risk score (0-100)
- List of threats detected (e.g., "API Key", "Email Address")
- Three options: **Cancel | Redact & Send | Send Anyway**

You choose what to do next.

### Q: What if I click "Redact & Send"?
**A:** InferShield automatically replaces sensitive data with `[REDACTED]` and sends the modified message. Example:
- **Before:** "My API key is sk-1234567890abcdef"
- **After:** "My API key is [REDACTED]"

---

## 🔐 Privacy & Security

### Q: What data does InferShield collect?
**A:** InferShield temporarily scans the text you're about to send. After the scan completes (< 100ms), **the text is immediately discarded**. We do not store message content.

**Metadata we keep (30 days):**
- Timestamp
- Risk score
- Threat types detected (e.g., "API key", "email")

**We do NOT keep:**
- Your message content
- The actual values of detected PII
- Your browsing history

### Q: Is InferShield GDPR/CCPA compliant?
**A:** Yes. We comply with GDPR and CCPA. You have the right to access, delete, or export your data. See our Privacy Policy: https://infershield.io/privacy

### Q: Can InferShield see my passwords or banking info?
**A:** InferShield only analyzes text you type in supported AI chat platforms (ChatGPT, Claude, Gemini, Copilot). It does NOT access:
- Your browsing history
- Other websites
- Browser passwords
- Banking sites
- Any data outside of the supported platforms

### Q: Is InferShield open source?
**A:** Yes! 100% open source. Audit the code on GitHub: https://github.com/InferShield/infershield

### Q: Where is my data stored?
**A:** Your API key is stored locally in your browser. Message scans are processed on our backend (Railway.app, SOC 2 certified) and immediately discarded. No message content is stored in any database.

---

## 💰 Pricing & Plans

### Q: Is there a free tier?
**A:** Yes! The free tier includes:
- 100 scans per month
- All threat detection features
- All supported platforms

### Q: What happens if I exceed my scan limit?
**A:** InferShield will show a message asking you to upgrade or wait until next month. Your existing protection stops working until you upgrade or your limit resets.

### Q: How much does Pro cost?
**A:**
- **Pro:** $99/month (10,000 scans)
- **Enterprise:** $499/month (100,000 scans + SSO + custom patterns)

### Q: Can I self-host for free?
**A:** Yes! InferShield is open source. Host your own backend and point the extension to your API endpoint. Unlimited scans, full control. See: https://github.com/InferShield/infershield

---

## 🛠️ Troubleshooting

### Q: The extension isn't working. What should I check?
**A:**
1. Is the extension enabled? (chrome://extensions)
2. Have you configured your API endpoint and key?
3. Is the platform enabled in settings? (Click extension icon → check platform toggles)
4. Try refreshing the chat page
5. Check browser console (F12) for errors

### Q: I get "API error" when sending messages. Why?
**A:** Common causes:
- Invalid API key (verify in extension settings)
- API key expired or revoked
- Backend is down (check https://app.infershield.io/health)
- Rate limit exceeded (upgrade your plan)

### Q: The modal doesn't appear even though I have PII in my message.
**A:**
1. Verify the platform is enabled in settings
2. Refresh the chat page
3. Make sure you're on a supported URL (e.g., chat.openai.com, not chatgpt.org)
4. Check if "Send" button was clicked (modal only appears on send)

### Q: Can I use InferShield on mobile?
**A:** Not yet. InferShield is currently a desktop browser extension (Chrome, Edge, Brave, etc.). Mobile support is planned for the future.

### Q: Does InferShield work on Firefox?
**A:** Not yet. We're starting with Chromium browsers (Chrome, Edge, Brave). Firefox support is coming soon.

---

## 🚨 Edge Cases

### Q: What if I want to intentionally share sensitive data with AI?
**A:** Click "Send Anyway" when the modal appears. InferShield warns but doesn't force you.

### Q: Does InferShield slow down my chat experience?
**A:** No. Scans complete in < 100ms, which is imperceptible. If your backend is slow or down, you'll see an error but your chat won't freeze.

### Q: What if InferShield has a false positive?
**A:** If InferShield incorrectly flags something as sensitive:
1. Click "Send Anyway" to proceed
2. Report the false positive on GitHub Issues
3. We'll improve the detection algorithm in the next update

### Q: Can I customize which PII types to detect?
**A:** Not yet. Custom patterns are available in the Enterprise plan ($499/month). For self-hosters, you can modify the backend code to add/remove patterns.

---

## 🤝 Support & Community

### Q: How do I report a bug?
**A:** Open an issue on GitHub: https://github.com/InferShield/infershield/issues

### Q: How do I request a new platform (e.g., Perplexity, Poe)?
**A:** Open a feature request on GitHub with the platform URL. We'll prioritize based on community votes.

### Q: Can I contribute to InferShield?
**A:** Yes! We welcome contributions:
- Fork the repo
- Make your changes
- Submit a pull request

See: https://github.com/InferShield/infershield

### Q: How do I contact support?
**A:**
- Email: support@hozyne.com
- GitHub Issues: https://github.com/InferShield/infershield/issues
- Response time: Usually within 24 hours

---

## 🔄 Updates & Roadmap

### Q: How often is InferShield updated?
**A:** We release updates regularly:
- New threat patterns: Monthly
- Platform support: Quarterly
- Bug fixes: As needed

Updates are automatic via Chrome Web Store.

### Q: What's on the roadmap?
**A:**
- Firefox support
- Mobile app
- More AI platforms (Perplexity, Poe, etc.)
- Custom PII patterns (Enterprise feature)
- Webhooks for security teams
- SSO integration (Google, Okta)

Vote on features: https://github.com/InferShield/infershield/discussions

---

## 🏢 Enterprise

### Q: Can my company use InferShield?
**A:** Yes! Enterprise plan includes:
- 100,000 scans/month
- Custom PII patterns
- SSO integration
- Audit logs
- Priority support
- Dedicated account manager

Contact sales: support@hozyne.com

### Q: Can we self-host for compliance reasons?
**A:** Yes! Self-hosting is perfect for:
- HIPAA compliance
- Government regulations
- Internal-only deployments
- Data sovereignty requirements

See deployment guide: https://github.com/InferShield/infershield

---

## ⚖️ Legal

### Q: What's the license?
**A:** MIT License (open source). See: https://github.com/InferShield/infershield/blob/main/LICENSE

### Q: Where can I read the Privacy Policy?
**A:** https://infershield.io/privacy

### Q: Where can I read the Terms of Service?
**A:** https://infershield.io/terms

---

**Still have questions? Email us: support@hozyne.com** 📧
