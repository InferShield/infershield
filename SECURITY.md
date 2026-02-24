# Security Policy

## Supported Versions

We actively support the following versions with security updates:

| Version | Supported          | Component |
| ------- | ------------------ | --------- |
| 0.8.x   | :white_check_mark: | Proxy     |
| 0.7.x   | :white_check_mark: | Platform  |
| 0.6.x   | :x:                | Legacy    |
| < 0.6   | :x:                | Legacy    |

## Reporting a Vulnerability

**Please do not report security vulnerabilities through public GitHub issues.**

If you discover a security vulnerability in InferShield, please report it to us privately:

### Email

Send details to: **security@infershield.io**

### What to Include

Please include the following information in your report:

- **Description** of the vulnerability
- **Steps to reproduce** (or proof of concept)
- **Potential impact** (what an attacker could do)
- **Affected versions/components** (Proxy, Platform, Extension, etc.)
- **Suggested fix** (if you have one)

### Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial assessment**: Within 72 hours
- **Status updates**: Every 7 days until resolution
- **Fix release**: Severity-dependent (see below)

### Severity Levels & Response Times

| Severity | Description | Target Fix Time |
|----------|-------------|-----------------|
| **Critical** | Remote code execution, authentication bypass, data breach | 24-48 hours |
| **High** | Privilege escalation, SQL injection, XSS affecting core functionality | 7 days |
| **Medium** | Information disclosure, denial of service, non-core XSS | 30 days |
| **Low** | Security hardening, minor information leaks | 90 days |

## Security Model

### Data Handling

**What InferShield logs:**
- Request metadata (timestamp, user ID, API key ID, model used)
- Prompt text (for threat analysis)
- Response text (for threat analysis)
- Risk scores and detected threats
- IP addresses (optional, can be disabled)

**What InferShield does NOT log:**
- User passwords (stored as bcrypt hashes only)
- API keys in plaintext (stored as bcrypt hashes only)
- Payment information (handled by Stripe)

**PII Redaction:**
- InferShield can automatically redact PII from logs (configurable)
- Supported PII types: SSN, credit cards, emails, phone numbers, addresses, medical records
- Redaction is optional (some users need full logs for compliance)

### Blocked Requests

When InferShield blocks a high-risk request:
- The request **never reaches the LLM provider**
- The user receives an error response
- The blocked request is logged with full details (for forensic analysis)
- The API key owner is notified (if configured)

### Data Storage

**Self-hosted deployment (recommended):**
- All data stays in your infrastructure
- You control the database (PostgreSQL)
- You control retention policies
- InferShield never phones home

**Cloud deployment:**
- If using Railway/Heroku/etc., data resides in your cloud account
- Database backups are your responsibility
- Configure encryption at rest in your cloud provider

### Authentication & Authorization

**Platform (v0.9.0+):**
- Passwords hashed with bcrypt (10 rounds)
- JWT tokens (7-day expiry, secure httpOnly cookies)
- API keys hashed with bcrypt (plaintext shown once)
- Rate limiting on authentication endpoints
- Email verification required

**Proxy (v1.0.0+):**
- API key authentication only
- Rate limiting per key (configurable)
- No session state (stateless)

### Network Security

**TLS/SSL:**
- Required in production (proxy validates upstream certificates)
- Self-signed certificates supported for internal deployments
- Certificate pinning not enforced (for flexibility)

**Firewall:**
- Proxy binds to 0.0.0.0:8000 by default (configure to 127.0.0.1 for localhost-only)
- Platform API binds to 0.0.0.0:5000 by default
- Dashboard binds to 0.0.0.0:3000 by default

**Recommended production setup:**
- Place proxy behind reverse proxy (nginx, Caddy, Traefik)
- Use TLS termination at reverse proxy
- Restrict database access to backend only
- Enable firewall rules (only expose ports 80, 443)

## Security Best Practices

### Deployment

1. **Use HTTPS in production** (via reverse proxy)
2. **Rotate API keys regularly** (every 90 days)
3. **Enable PII redaction** if you don't need full logs
4. **Set appropriate risk thresholds** (default: block >= 80)
5. **Monitor audit logs** for suspicious patterns
6. **Keep InferShield updated** (subscribe to GitHub releases)

### Configuration

1. **Use environment variables** for secrets (never commit to git)
2. **Restrict database access** (whitelist IPs if possible)
3. **Enable rate limiting** (default: 100/hour for free tier)
4. **Configure Sentry** for error monitoring
5. **Set up backups** for PostgreSQL database

### API Keys

1. **Name keys descriptively** (e.g., "production-web-app")
2. **Use separate keys per environment** (dev, staging, production)
3. **Revoke compromised keys immediately**
4. **Never embed keys in client-side code**
5. **Rotate keys after personnel changes**

## Known Limitations

InferShield is a security **tool**, not a security **guarantee**. Known limitations:

1. **LLM Provider Security**: InferShield can't protect against vulnerabilities in the LLM provider itself
2. **Zero-day Attacks**: New attack patterns may not be detected until detection rules are updated
3. **False Negatives**: Sophisticated attacks may bypass detection (continuously improving)
4. **False Positives**: Legitimate requests may occasionally be flagged (tune thresholds)
5. **Performance**: Detection adds ~1ms latency per request

## Compliance

InferShield is designed to support compliance with:

- **SOC 2**: Audit logs, access controls, change management
- **HIPAA**: PHI detection/redaction, audit trails, encryption
- **GDPR**: Data minimization, right to deletion, privacy by design
- **PCI DSS**: PAN detection/redaction, access logging

**Note**: InferShield provides *tools* for compliance. Achieving certification requires holistic organizational controls.

## Security Updates

Subscribe to security updates:

- **GitHub Security Advisories**: [Watch this repo](https://github.com/InferShield/infershield)
- **Email**: security@infershield.io (low-volume, security-only)
- **RSS**: [Releases feed](https://github.com/InferShield/infershield/releases.atom)

## Bug Bounty

We currently do not have a formal bug bounty program. However:

- **Critical vulnerabilities**: Eligible for recognition in release notes (with your permission)
- **Hall of fame**: Security researchers credited in [SECURITY_ACKNOWLEDGMENTS.md](./docs/SECURITY_ACKNOWLEDGMENTS.md)

We're grateful for responsible disclosure. 🙏

## Questions?

For security questions that aren't vulnerabilities:
- **GitHub Discussions**: [Security category](https://github.com/InferShield/infershield/discussions/categories/security)
- **Email**: security@infershield.io

---

**Thank you for helping keep InferShield and its users safe!**
