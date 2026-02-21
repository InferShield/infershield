# InferShield 🛡️

**Open source security for LLM inference**

InferShield is a self-hosted security proxy that sits between your application and any LLM provider (OpenAI, Anthropic, Google, etc.), providing real-time threat detection, policy enforcement, and complete audit trails.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Security: Active](https://img.shields.io/badge/Security-Active-success.svg)](https://github.com/infershield/infershield)

## 🚨 The Problem

- **Prompt injection attacks** bypass traditional security tools
- **Data exfiltration** through LLM responses goes undetected
- **Compliance requirements** (SOC 2, HIPAA, GDPR) can't be met
- **No visibility** into what your LLMs are actually doing

## ✨ The Solution

InferShield provides enterprise-grade security for LLM integrations:

- ✅ **Real-time threat detection** - Block prompt injection, data exfiltration, jailbreaks
- ✅ **Self-hosted** - Your data never leaves your infrastructure
- ✅ **Provider-agnostic** - Works with OpenAI, Anthropic, Google, local models
- ✅ **Zero code changes** - Drop-in proxy, just change your API endpoint
- ✅ **Complete audit logs** - Every request tracked with risk scores
- ✅ **Open source** - MIT licensed, transparent, community-driven

## 🚀 Quick Start

### Using Docker (Recommended)

```bash
# Pull the image
docker pull infershield/proxy:latest

# Run the proxy
docker run -p 8000:8000 \
  -e OPENAI_API_KEY=sk-your-key-here \
  infershield/proxy

# Update your code (one line change)
# Before:
client = OpenAI(base_url="https://api.openai.com/v1")

# After:
client = OpenAI(base_url="http://localhost:8000/v1")
```

### Using Docker Compose

```bash
git clone https://github.com/infershield/infershield.git
cd infershield
cp .env.example .env  # Add your API keys
docker-compose up -d
```

Now visit:
- **Proxy:** http://localhost:8000
- **Dashboard:** http://localhost:3000
- **Backend API:** http://localhost:5000

## 📊 Architecture

```
┌─────────────┐      ┌──────────────────┐      ┌─────────────┐
│  Your App   │ ───> │  InferShield     │ ───> │   Any LLM   │
│             │      │  Proxy           │      │  Provider   │
│ app.py      │      │  localhost:8000  │      │ OpenAI/etc  │
└─────────────┘      └──────────────────┘      └─────────────┘
                             │
                             │ logs/metrics
                             ▼
                     ┌──────────────────┐
                     │  Dashboard       │
                     │  localhost:3000  │
                     └──────────────────┘
```

## 🛡️ Security Features

### Threat Detection

- **Prompt Injection** - Detects attempts to override system instructions
- **Data Exfiltration** - Blocks requests trying to extract sensitive data
- **Jailbreak Attempts** - Identifies evasion techniques (encoding, obfuscation)
- **SQL Injection** - Catches database attack patterns
- **PII Leakage** - Detects personally identifiable information

### Advanced Detection Methods

- **Multi-encoding detection** - Base64, hex, URL, Unicode escaping
- **Nested encoding** - Handles chained obfuscation (Base64 of hex, etc.)
- **Synonym expansion** - Catches evasion via alternative phrasing
- **Context-aware scoring** - Reduces false positives with proximity analysis
- **Custom policies** - Define your own threat detection rules

### Audit & Compliance

- **Complete request logs** - Every prompt and response recorded
- **Risk scoring** - 0-100 scale for every request
- **Policy enforcement** - Block high-risk requests automatically
- **Export capabilities** - JSON/CSV for compliance reporting
- **Timestamped trails** - Forensic-ready audit logs

## 📦 Components

### 1. Proxy (`/proxy`)

OpenAI-compatible security proxy server.

- Drop-in replacement for any OpenAI SDK
- Forwards to configured LLM provider
- Real-time threat detection
- < 1ms latency overhead

[Proxy Documentation →](./proxy/README.md)

### 2. Backend (`/backend`)

Threat detection engine and API.

- 12+ detection policies
- Risk scoring algorithm
- Audit log storage
- REST API for dashboard

[Backend Documentation →](./backend/README.md)

### 3. Dashboard (`/dashboard`)

Real-time monitoring interface.

- Live request stream
- Threat analytics
- Risk score trends
- Audit log viewer

[Dashboard Documentation →](./dashboard/README.md)

## 🔧 Configuration

Create a `.env` file:

```env
# LLM Provider API Keys
OPENAI_API_KEY=sk-your-key-here
ANTHROPIC_API_KEY=sk-ant-your-key-here

# InferShield Backend
BACKEND_URL=http://localhost:5000

# Security Settings
RISK_THRESHOLD=70
BLOCK_HIGH_RISK=true
```

See [Configuration Guide →](./docs/configuration.md) for all options.

## 📈 Performance

- **Latency:** < 1ms overhead per request
- **Throughput:** 1000+ requests/second (single instance)
- **Memory:** ~50MB base usage
- **Storage:** ~1KB per logged request

## 🧪 Validation Results

InferShield has been red-team tested with 25+ attack vectors:

- ✅ **95%+ detection rate** across all threat types
- ✅ **< 5% false positive rate** on legitimate queries
- ✅ **100% blocking** of known bypass techniques (encoding, obfuscation)

See [Security Validation Report →](./docs/validation.md)

## 🏢 Enterprise Features

Looking for advanced capabilities?

**InferShield Enterprise** includes:

- 🔬 **ML-based detection** - Advanced behavioral analysis
- 📋 **Compliance packs** - SOC 2, HIPAA, GDPR templates
- 🔗 **SSO/SAML** - Enterprise authentication
- 📊 **Custom dashboards** - Tailored reporting
- ☁️ **Managed hosting** - Fully managed cloud deployment
- 🆘 **24/7 support** - Dedicated security hotline

[Learn more about Enterprise →](https://infershield.io)

## 🤝 Contributing

We welcome contributions! See [CONTRIBUTING.md](./CONTRIBUTING.md) for guidelines.

**Quick ways to contribute:**

- 🐛 Report bugs via [GitHub Issues](https://github.com/infershield/infershield/issues)
- 💡 Suggest features in [Discussions](https://github.com/infershield/infershield/discussions)
- 🔧 Submit pull requests (see [Development Guide](./docs/development.md))
- 📝 Improve documentation
- 🧪 Add detection policies

## 📚 Documentation

- [Installation Guide](./docs/installation.md)
- [Configuration Reference](./docs/configuration.md)
- [API Documentation](./docs/api.md)
- [Custom Policies](./docs/policies.md)
- [Security Validation](./docs/validation.md)
- [Troubleshooting](./docs/troubleshooting.md)

## 📝 License

InferShield is MIT licensed. See [LICENSE](./LICENSE) for details.

**Free forever. No strings attached.**

## 🌐 Community

- **Website:** [infershield.io](https://infershield.io)
- **GitHub:** [github.com/infershield](https://github.com/infershield)
- **Discord:** Coming soon
- **Twitter:** Coming soon
- **Email:** security@infershield.io

## ⭐ Star History

If InferShield helps secure your LLM infrastructure, consider giving us a star! ⭐

## 🙏 Acknowledgments

Built with inputs from security leaders in:
- Finance (banking, fintech)
- Healthcare (HIPAA-regulated orgs)
- Government (federal/state agencies)

Special thanks to the open source community for security research and feedback.

---

**Built for security teams, by security engineers.**

© 2026 InferShield · Secure every inference
