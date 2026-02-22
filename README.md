# InferShield 🛡️

**Open-source security for LLM inference — detect threats, block PII, audit everything.**

InferShield is a self-hosted security platform that protects your AI applications from prompt injection, data exfiltration, and PII leaks. Works with any LLM provider (OpenAI, Anthropic, Google, local models) through a drop-in proxy, browser extension, or direct API integration.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](./LICENSE)
[![Security: Active](https://img.shields.io/badge/Security-Active-success.svg)](./SECURITY.md)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](./CONTRIBUTING.md)

---

## What is InferShield?

InferShield provides enterprise-grade security for LLM applications through **three integrated components**:

🧩 **Browser Extension** — Intercept and analyze LLM requests from any web app (ChatGPT, Claude, etc.)  
📡 **Security Proxy** — Drop-in OpenAI-compatible proxy for server-side protection (any language/framework)  
🖥️ **Self-Serve Platform** — User accounts, API key management, usage tracking, and real-time monitoring dashboard

**Current Status:**
- ✅ **Platform v0.7.0** — Production-ready with authentication, API keys, PII detection, and quota management
- ✅ **Proxy v0.8.1** — Verified on Windows and Linux with advanced threat detection (< 1ms latency)
- ⏳ **Chrome Extension v1.0** — Submitted to Chrome Web Store (pending review, ~7 days)

---

## Quick Start

### 🧩 Option 1: Browser Extension (Chrome)

**Status:** Pending Chrome Web Store review (available ~March 1, 2026)

Once approved:
1. Install from Chrome Web Store
2. Sign up for free account (100 requests/month)
3. Browse ChatGPT, Claude, or any LLM web interface
4. View real-time threat detection in extension popup

**Early Access:** Email hello@infershield.io for developer build.

### 📡 Option 2: Security Proxy (Developers)

**Windows:**

```powershell
# Download the latest release
curl -o infershield-proxy.exe https://github.com/InferShield/infershield/releases/latest/download/infershield-proxy-windows.exe

# Run the proxy (add your OpenAI key)
$env:OPENAI_API_KEY="sk-your-key-here"
.\infershield-proxy.exe

# Proxy running at http://localhost:8000
```

**Mac/Linux:**

```bash
# Clone and run via Docker
git clone https://github.com/InferShield/infershield.git
cd infershield
docker-compose up -d

# Or run directly with Node.js
cd proxy
npm install
OPENAI_API_KEY=sk-your-key-here npm start
```

**Update your code (one line):**

```python
# Before:
from openai import OpenAI
client = OpenAI()

# After:
client = OpenAI(base_url="http://localhost:8000/v1")
```

Now visit:
- **Dashboard:** http://localhost:3000
- **API:** http://localhost:5000

---

## Screenshots

<!-- TODO: Add production screenshots once deployed -->

**Dashboard Overview:**  
![Dashboard Screenshot](https://via.placeholder.com/800x400?text=Dashboard+Screenshot+Coming+Soon)

**Real-Time Threat Detection:**  
![Threat Detection](https://via.placeholder.com/800x400?text=Threat+Detection+Screenshot+Coming+Soon)

---

## Security Model

### What InferShield Protects Against

- ✅ **Prompt Injection** — Detects attempts to override system instructions
- ✅ **Data Exfiltration** — Blocks requests trying to extract sensitive data
- ✅ **PII Leakage** — Identifies 15+ types of personally identifiable information (SSN, credit cards, emails, etc.)
- ✅ **Jailbreak Attempts** — Catches evasion techniques (encoding, obfuscation, role-play attacks)
- ✅ **SQL Injection** — Prevents database attack patterns in prompts
- ✅ **Secrets Exposure** — Detects API keys, passwords, tokens in requests

### What Data is Logged

**Logged by default:**
- Request metadata (timestamp, user ID, API key ID, model, risk score)
- Prompt text (for threat analysis)
- Response text (for threat analysis)
- Detected threats and policy violations

**NOT logged:**
- User passwords (stored as bcrypt hashes only)
- API keys in plaintext (stored as bcrypt hashes only)
- Payment information (handled by Stripe)

**PII Redaction:** Optionally enable automatic PII redaction in logs (SSN, credit cards, etc. replaced with `[REDACTED]`). See [Configuration Guide](./docs/QUICKSTART.md).

### Blocked Requests

When a high-risk request is detected (configurable threshold, default ≥80):
- ❌ Request is **blocked before reaching the LLM provider**
- 📊 Full request details logged for forensic analysis
- 🔔 API key owner notified (if configured)
- 🚫 User receives error response with risk explanation

**Self-hosted = Your data never leaves your infrastructure.**

---

## Features

### Platform (v0.7.0)

- 🔐 **User Authentication** — Self-service signup, JWT sessions, email verification
- 🔑 **API Key Management** — Generate unlimited keys, tag by environment, track usage
- 📊 **Usage Tracking** — Real-time metering, quota enforcement (100 req/month free tier)
- 🛡️ **PII Detection** — 15+ patterns (SSN, credit cards, phone, email, medical records, etc.)
- 🎭 **Demo Mode** — Try InferShield without signup (10 requests, no registration)
- 📈 **Monitoring** — Sentry integration, Prometheus metrics, health checks
- 🗄️ **Database** — PostgreSQL backend with Prisma ORM, automated migrations

### Proxy (v0.8.1)

- ⚡ **< 1ms Latency** — Minimal overhead per request
- 🔌 **OpenAI-Compatible** — Drop-in replacement for any OpenAI SDK (Python, Node.js, etc.)
- 🌐 **Multi-Provider** — OpenAI, Anthropic, Google, Cohere, local models (via LiteLLM)
- 🛡️ **12+ Detection Policies** — Prompt injection, data exfiltration, encoding attacks, etc.
- 🔍 **Advanced Obfuscation Detection** — Base64, hex, URL encoding, nested encodings
- 🚦 **Risk Scoring** — 0-100 scale for every request with configurable thresholds
- 📋 **Complete Audit Logs** — Forensic-ready request/response logging

### Browser Extension (v1.0 — pending review)

- 🌐 **Universal Coverage** — Works on ChatGPT, Claude, Gemini, and any LLM web interface
- 🔴 **Real-Time Alerts** — Popup notifications for detected threats
- 📊 **Per-Site Stats** — Track risk scores by domain
- ⚙️ **Configurable** — Set your own risk thresholds and policies
- 🔒 **Privacy-First** — Requests analyzed locally, only metadata sent to platform (optional)

---

## Roadmap

### Q1 2026 (Now)

- ✅ Platform v0.7.0 — Self-service platform with API keys and PII detection
- ✅ Proxy v0.8.1 — Windows/Linux verified, advanced obfuscation detection
- ⏳ Chrome Extension v1.0 — Chrome Web Store approval (~March 1)

### Q2 2026

- 🦊 Firefox & Safari extensions
- 🤖 ML-based detection models (behavioral analysis)
- 🏢 Team accounts and role-based access control
- 📊 Custom dashboards and reporting
- 🔗 Zapier/Make.com integrations

### Q3 2026

- 📋 SOC 2, HIPAA, GDPR compliance packs
- ☁️ Managed cloud hosting option
- 🔬 Red team simulation tools
- 📱 Mobile app (iOS/Android)

### Future

- 🌐 Multi-language support (Spanish, French, German, etc.)
- 🧪 Custom policy builder (no-code threat detection)
- 🎓 Security training mode (educational feedback on risky prompts)

[Full Roadmap →](https://github.com/InferShield/infershield/projects)

---

## Documentation

- 📖 [Quickstart Guide](./docs/QUICKSTART.md) — Get running in 5 minutes
- 🪟 [Windows Setup](./docs/QUICKSTART_WINDOWS.md) — Windows-specific instructions
- 🔧 [Manual Integration](./docs/MANUAL_INTEGRATION.md) — API integration guide
- 🛡️ [PII Redaction](./docs/PII_REDACTION.md) — Configure PII detection
- 🏗️ [OAuth Architecture](./docs/OAUTH_ARCHITECTURE.md) — Authentication internals
- 🚀 [Deployment Guides](./docs/deployment/) — Railway, AWS, GCP, Azure
- 🧪 [Testing & Validation](./docs/development/TESTING.md) — Security validation
- 📊 [Stripe Setup](./docs/STRIPE_SETUP.md) — Payment integration (enterprise)

**More docs:** See [`/docs`](./docs/) directory for complete documentation.

---

## Contributing

We welcome contributions! InferShield is MIT-licensed and community-driven.

**Quick ways to contribute:**

- 🐛 **Report bugs** — [GitHub Issues](https://github.com/InferShield/infershield/issues/new?template=bug_report.yml)
- 💡 **Suggest features** — [Feature Requests](https://github.com/InferShield/infershield/issues/new?template=feature_request.yml)
- 🔧 **Submit PRs** — See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines
- 📝 **Improve docs** — Fix typos, add examples, write guides
- 🧪 **Add detection policies** — New threat detection patterns always welcome

**Developer setup:** See [CONTRIBUTING.md](./CONTRIBUTING.md) for local development instructions.

---

## Community & Support

- 🌐 **Website:** [infershield.io](https://infershield.io)
- 💬 **GitHub Discussions:** [Ask questions, share ideas](https://github.com/InferShield/infershield/discussions)
- 🐛 **Report Issues:** [Bug reports](https://github.com/InferShield/infershield/issues)
- 🔒 **Security:** [security@infershield.io](mailto:security@infershield.io) (private vulnerability reports)
- 📧 **General:** [hello@infershield.io](mailto:hello@infershield.io)

**Coming soon:**
- Discord community server
- Twitter/X (@infershield)
- Monthly office hours

---

## License

InferShield is [MIT licensed](./LICENSE). Free forever, no strings attached.

**Commercial use:** Fully permitted. Enterprise support available via [infershield.io](https://infershield.io).

---

## Acknowledgments

Built with inputs from security leaders in finance, healthcare, and government. Special thanks to the open-source community for security research and feedback.

**Security researchers:** See [SECURITY.md](./SECURITY.md) for our vulnerability disclosure policy.

---

## Star History

If InferShield helps secure your LLM infrastructure, consider giving us a star! ⭐

[![Star History Chart](https://api.star-history.com/svg?repos=InferShield/infershield&type=Date)](https://star-history.com/#InferShield/infershield&Date)

---

**Built for security teams, by security engineers.**

© 2026 InferShield · Secure every inference · [infershield.io](https://infershield.io)
