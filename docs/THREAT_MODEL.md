# InferShield Threat Model

## Scope

InferShield v0.9.0 is a proof-of-concept session-aware detection system for LLM inference attacks. This document defines what InferShield protects against, what it does not protect against, and the assumptions required for effective deployment.

---

## Protected Boundary

InferShield sits between the client (user or application) and the LLM provider. It analyzes HTTP requests and responses in transit.

```
[ Client Application ]
       |
       v
[ InferShield Proxy ] <-- Detection Layer
       |
       v
[ LLM Provider (OpenAI, Anthropic, etc.) ]
```

**Protected:**
- HTTP requests to LLM APIs
- HTTP responses from LLM APIs
- Session state within a single InferShield instance

**Not Protected:**
- Direct connections that bypass InferShield
- Client-side attacks (browser exploits, XSS in client apps)
- Server-side attacks on the LLM provider infrastructure
- Attacks on InferShield itself (no self-defense mechanisms)

---

## Assumptions

InferShield requires the following conditions to function:

### Deployment Assumptions
- InferShield is deployed inline with LLM traffic (not as a sidecar or out-of-band monitor)
- All LLM requests pass through InferShield (no bypass routes exist)
- InferShield has network access to the LLM provider
- InferShield runs on a trusted host (no malware or compromise)

### Network Assumptions
- TLS termination occurs at InferShield (not upstream)
- Network latency between InferShield and LLM provider is < 100ms
- No aggressive timeout policies on the client (allows InferShield processing time)

### Configuration Assumptions
- Detection policies are enabled (default configuration)
- Risk threshold is set appropriately (default: 80)
- Session tracking is enabled (default: in-memory with 1-hour TTL)

### Trust Assumptions
- InferShield administrators are trusted (have access to all LLM traffic logs)
- The host operating system is trusted (no kernel-level attacks)
- The database (PostgreSQL) is trusted and secured
- API keys stored in InferShield are protected (bcrypt hashes, no plaintext)

---

## Detected Attack Vectors

InferShield v0.9.0 detects the following attack patterns:

### Single-Request Attacks
- **Prompt Injection** - Attempts to override system instructions (e.g., "Ignore all previous instructions")
- **SQL Injection** - SQL syntax in prompts (e.g., "'; DROP TABLE users;--")
- **Command Injection** - Shell metacharacters in prompts (e.g., "$(whoami)")
- **XSS Injection** - HTML/JavaScript in prompts (e.g., "<script>alert(1)</script>")
- **Data Exfiltration** - Requests to send data externally (e.g., "Email this to attacker@example.com")
- **PII Leakage** - Detection of SSN, credit cards, emails, phone numbers in requests

### Encoding Evasion (v0.9.0)
- **Base64 Encoding** - Malicious payloads encoded in Base64
- **URL Encoding** - Malicious payloads percent-encoded
- **Double Encoding** - Nested encoding (Base64 inside URL encoding)

### Multi-Step Attacks (Session-Aware)
- **Cross-Step Exfiltration** - READ + TRANSFORM + SEND sequences
- **Privilege Escalation** - Gradual permission increases across requests
- **Behavioral Divergence** - Interleaving benign and malicious actions

### Context-Aware Detection (v0.9.0)
- **JWT Token Exclusion** - Does not flag legitimate JWT tokens as threats
- **API Key Exclusion** - Does not flag legitimate API keys (sk-, pk_live-, AKIA, ghp_ prefixes)

---

## Out-of-Scope Threats

InferShield v0.9.0 does **NOT** detect or prevent:

### Advanced Attacks
- **Zero-Day Exploits** - Unknown attack patterns not in detection rules
- **Model Poisoning** - Attacks on LLM training data or fine-tuning
- **Model Extraction** - Attempts to reverse-engineer LLM weights
- **Adversarial Examples** - Subtle input perturbations that fool detection
- **Steganography** - Hidden messages in benign-looking text

### Multi-Session Attacks
- **Distributed Attacks** - Attacks spread across multiple user sessions or API keys
- **Sybil Attacks** - Creating multiple fake accounts to bypass rate limits
- **Timing Attacks** - Inference of sensitive data via response timing

### Infrastructure Attacks
- **DDoS on InferShield** - Resource exhaustion attacks targeting InferShield itself
- **Man-in-the-Middle** - Network-level interception (assumes TLS is configured correctly)
- **Database Attacks** - SQL injection into InferShield's PostgreSQL database
- **Memory Exploits** - Buffer overflows or memory corruption in InferShield

### Social Engineering
- **Phishing** - Tricking users into providing credentials
- **Insider Threats** - Malicious InferShield administrators
- **Physical Access** - Attackers with physical access to the InferShield host

### Limitations by Design
- **No ML-Based Detection** - All detection is rule-based (no machine learning models)
- **No Distributed State** - Session tracking is per-instance (no Redis or external state)
- **No Multi-Provider Correlation** - Cannot detect attacks that span multiple LLM providers
- **No Real-Time Threat Intelligence** - No integration with external threat feeds

---

## Trust Model

### Trusted Components
- **InferShield codebase** - Assumed to be free of vulnerabilities (open-source, community-reviewed)
- **Host operating system** - Assumed to be patched and hardened
- **Database (PostgreSQL)** - Assumed to be secured with proper access controls
- **LLM provider** - Assumed to return responses without injecting malicious content

### Untrusted Components
- **Client applications** - May send malicious requests (this is what InferShield protects against)
- **User input** - All prompts and responses are untrusted
- **Network traffic** - All HTTP requests/responses are analyzed as potentially malicious

### Partially Trusted
- **InferShield administrators** - Have access to logs and configurations (need operational access but must be monitored)
- **API keys** - Stored as bcrypt hashes (secure at rest but must be protected in transit)

---

## Deployment Considerations

### Security
- Deploy InferShield on a dedicated host (do not co-locate with application servers)
- Enable TLS for all connections (client to InferShield, InferShield to LLM provider)
- Use firewall rules to restrict access to InferShield (only allow application servers)
- Rotate API keys regularly (recommend 90-day rotation policy)
- Monitor logs for anomalies (recommend Sentry or similar monitoring)

### Performance
- Provision resources for < 5ms per-request overhead (CPU and memory)
- Session storage grows linearly with active users (plan for 1 MB per 1000 sessions)
- Database I/O is the primary bottleneck (use SSD storage for PostgreSQL)

### Availability
- InferShield is a single point of failure (if it fails, LLM requests fail)
- No built-in high availability (recommend load balancer + multiple instances)
- In-memory sessions are lost on restart (no persistence across restarts)

### Compliance
- Logs contain prompts and responses (may include sensitive data)
- Enable PII redaction if subject to GDPR or HIPAA (see docs/PII_REDACTION.md)
- API keys are stored as bcrypt hashes (compliant with PCI-DSS for secret management)

---

## Known Gaps

### Detection Gaps
- **Limited obfuscation detection** - Only handles Base64, URL encoding, and simple nesting
- **No semantic analysis** - Cannot detect context-dependent threats (e.g., "How do I hack a system?" vs "How do I hack a cough?")
- **No behavioral baselining** - No concept of "normal" user behavior to detect anomalies

### Operational Gaps
- **No alerting** - Detection events are logged but not actively pushed to administrators
- **No rate limiting** - No built-in protection against abuse or resource exhaustion
- **No forensic tools** - Logs are unstructured (no built-in query or analysis tools)

### Architectural Gaps
- **Single-instance only** - No support for distributed deployment or shared state
- **No plugin system** - Detection policies are hardcoded (no external policy loading)
- **No API for external tools** - Cannot integrate with SIEM or SOAR platforms

---

## Revision History

- **v0.9.0 (2026-02-29)** - Initial threat model document
