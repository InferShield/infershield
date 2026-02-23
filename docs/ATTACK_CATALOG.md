# InferShield Attack Catalog

Known attack patterns and detection status for InferShield v0.9.0.

---

## 1. Encoding Evasion

**Description:** Malicious payloads encoded (Base64, URL encoding, hex) to bypass signature-based detection.

**Preconditions:**
- Detection system analyzes raw input without normalization
- Application decodes user input before processing

**Step Sequence:**
1. Attacker encodes malicious payload using supported encoding (Base64, URL, hex)
2. Encoded payload sent in HTTP request
3. Application decodes payload and executes malicious content

**Detection Status:** Mitigated (v0.9.0)

**Notes:** Input normalization added. All inputs decoded before policy evaluation. Handles single and double encoding (Base64 inside URL encoding).

---

## 2. Polymorphic Injection

**Description:** Dynamically varying code structure to evade signature-based detection while maintaining malicious function.

**Preconditions:**
- Detection system relies on static signatures
- Application executes user-provided code or commands

**Step Sequence:**
1. Attacker generates payload with variable structure (different variable names, whitespace, comments)
2. Payload sent with unique structure each time
3. Application executes payload despite structural variations

**Detection Status:** Partial (v0.9.0)

**Notes:** Behavioral pattern analysis detects common polymorphic techniques. Advanced obfuscation (semantic equivalence, code mutation) not detected.

---

## 3. Interleaving Attacks (Behavioral Divergence)

**Description:** Malicious actions split across multiple requests, mixing benign and malicious steps to evade single-request analysis.

**Preconditions:**
- Detection system analyzes requests in isolation
- Application maintains session state across requests

**Step Sequence:**
1. Attacker performs benign action (e.g., "List all users")
2. Attacker performs another benign action (e.g., "Format as CSV")
3. Attacker performs malicious action (e.g., "Send to external URL")
4. Combined sequence achieves unauthorized data exfiltration

**Detection Status:** Blocked (v0.9.0)

**Notes:** Session history tracking added. Risk scoring accumulates across requests. READ + TRANSFORM + SEND patterns detected as high-risk.

---

## 4. Cross-Step Exfiltration

**Description:** Multi-step attack using legitimate application workflows to extract sensitive data.

**Preconditions:**
- Application exposes data retrieval, transformation, and export functions
- Detection system does not validate end-to-end workflow outcomes

**Step Sequence:**
1. Request sensitive data (DATABASE_READ action)
2. Transform data to exportable format (DATA_TRANSFORM action)
3. Export data to external destination (EXTERNAL_API_CALL action)

**Detection Status:** Blocked (v0.9.0)

**Notes:** Cross-step escalation policy detects READ + TRANSFORM + SEND sequences. Risk score increases with each step. Final SEND action blocked when risk exceeds threshold.

---

## 5. Privilege Escalation Chains

**Description:** Series of exploits that incrementally increase attacker privileges.

**Preconditions:**
- Application has multiple exploitable vulnerabilities
- Privileges can be escalated through chained exploits

**Step Sequence:**
1. Exploit low-privilege vulnerability to gain initial access
2. Use initial access to discover additional vulnerabilities
3. Chain exploits to achieve administrative access

**Detection Status:** Partial (v0.9.0)

**Notes:** Behavioral divergence detection identifies gradual privilege increases. Does not detect exploits themselves, only unusual escalation patterns.

---

## 6. API Chaining Abuse

**Description:** Combining multiple API calls in unintended sequence to achieve unauthorized outcomes.

**Preconditions:**
- APIs expose internal functionality without workflow constraints
- No validation of combined API usage patterns

**Step Sequence:**
1. Attacker analyzes API functionality and responses
2. Chains multiple API calls to create unauthorized workflow
3. Exploits chained workflow for malicious purpose

**Detection Status:** Partial (v0.9.0)

**Notes:** Behavioral divergence detection identifies non-standard API call sequences. Limited to known abuse patterns (no semantic workflow validation).

---

## 7. Resource Exhaustion

**Description:** Consuming system resources (CPU, memory, network) to cause denial of service.

**Preconditions:**
- System has finite resources with no hard limits
- Attacker can generate high-volume or resource-intensive requests

**Step Sequence:**
1. Identify resource bottleneck (CPU, memory, disk I/O)
2. Craft requests that consume target resource
3. Send requests in high volume

**Detection Status:** Not Detected (v0.9.0)

**Notes:** No rate limiting or resource monitoring in v0.9.0. Session tracking provides some visibility but no automatic blocking.

---

## 8. Multi-Session Correlation Gap

**Description:** Attacks distributed across multiple sessions or user accounts to evade per-session detection.

**Preconditions:**
- Detection system tracks state per session only
- Attacker controls multiple sessions or accounts

**Step Sequence:**
1. Perform part of attack in session A
2. Perform part of attack in session B
3. Combine results externally to achieve objective

**Detection Status:** Not Detected (v0.9.0)

**Notes:** Known limitation. InferShield v0.9.0 has no cross-session correlation. Each session analyzed independently.

---

## 9. Prompt Injection

**Description:** Overriding system instructions by injecting attacker-controlled directives into prompts.

**Preconditions:**
- Application includes user input in LLM prompts
- No input validation or sanitization

**Step Sequence:**
1. Attacker crafts prompt with override instructions (e.g., "Ignore all previous instructions")
2. Malicious prompt sent to LLM
3. LLM follows attacker instructions instead of system instructions

**Detection Status:** Blocked (v0.9.0)

**Notes:** Pattern-based detection for common prompt injection phrases. Does not detect novel or context-specific injections.

---

## 10. SQL Injection in Prompts

**Description:** SQL syntax injected into prompts to exploit database interactions.

**Preconditions:**
- Application includes LLM-generated content in SQL queries
- No parameterized queries or input sanitization

**Step Sequence:**
1. Attacker includes SQL syntax in prompt (e.g., "'; DROP TABLE users;--")
2. LLM incorporates SQL syntax in response
3. Application executes LLM response as SQL query

**Detection Status:** Blocked (v0.9.0)

**Notes:** Pattern-based detection for SQL keywords and metacharacters. May produce false positives for legitimate SQL discussions.

---

## 11. XSS Injection in Prompts

**Description:** HTML/JavaScript injected into prompts to exploit client-side rendering.

**Preconditions:**
- Application renders LLM responses in web browser
- No output sanitization or CSP headers

**Step Sequence:**
1. Attacker includes HTML/JavaScript in prompt (e.g., "<script>alert(1)</script>")
2. LLM incorporates script in response
3. Application renders response, executing script

**Detection Status:** Blocked (v0.9.0)

**Notes:** Pattern-based detection for script tags and event handlers. Does not detect obfuscated or context-dependent XSS.

---

## 12. PII Leakage

**Description:** Personally identifiable information included in prompts or responses.

**Preconditions:**
- User includes PII in prompts (intentionally or accidentally)
- No PII detection or redaction

**Step Sequence:**
1. User includes PII in prompt (SSN, credit card, email)
2. LLM processes prompt and includes PII in response
3. PII logged or exposed in application

**Detection Status:** Detected (v0.9.0)

**Notes:** Regex-based detection for 15+ PII types. Optional redaction available (replaces with [REDACTED]). May miss obfuscated or contextual PII.

---

## Detection Status Legend

- **Blocked** - Attack is detected and prevented from execution
- **Mitigated** - Attack is detected, risk reduced but not eliminated
- **Partial** - Some variants detected, others bypass detection
- **Detected** - Attack is logged but not prevented
- **Not Detected** - Attack bypasses detection (known limitation)

---

## Revision History

- **v0.9.0 (2026-02-29)** - Initial attack catalog with session-aware detection
