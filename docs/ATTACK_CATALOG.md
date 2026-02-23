# Attack Scenario Catalog

## 1. Polymorphic Injection
**Description:** This attack involves dynamically changing code structures to bypass signature-based detection mechanisms.

**Preconditions:**
- Target application accepts user input.
- Application processes this input without sufficient validation.

**Steps:**
1. An attacker creates a payload that changes structure (e.g., variable names or non-functional code alterations) with each execution.
2. Embed the payload into a request.
3. Send the payload to the target repeatedly, each time with slight variations.

**Expected Outcome:** The application executes the polymorphic payload, leading to unauthorized actions or data access.

**Detection Status:** Mitigated in v0.9.0

**Patch Reference:** IDS engine updated to analyze behavioral patterns rather than static signatures.

---

## 2. Encoding Evasion
**Description:** Attackers encode payloads in different formats to bypass detection mechanisms.

**Preconditions:**
- Target system allows encoded input (e.g., Base64, URL encoding).
- Detection mechanisms do not normalize or decode inputs properly.

**Steps:**
1. Encode malicious payload using a supported encoding method.
2. Send the encoded payload to the target.
3. Payload is decoded and executed on the server.

**Expected Outcome:** Malicious code is executed after decoding, compromising the target system.

**Detection Status:** Mitigated in v0.9.0

**Patch Reference:** Input normalization added, with comprehensive decoding before analysis.

---

## 3. Interleaving Attacks
**Description:** Malicious actions split into multiple smaller, seemingly innocuous steps to evade detection.

**Preconditions:**
- Multi-step workflows are parsed individually by the security system.
- No correlation exists between steps within a session.

**Steps:**
1. Break malicious activity into multiple smaller steps.
2. Submit each step separately within a session.
3. Combine steps to achieve the intended malicious goal on the server side.

**Expected Outcome:** Full malicious workflow completes undetected.

**Detection Status:** Blocked

**Patch Reference:** Enhanced stateful tracking across session steps.

---

## 4. Multi-Session Correlation Gap (Known Limitation)
**Description:** This involves exploiting detection systems that lack the ability to correlate actions across multiple sessions.

**Preconditions:**
- Security system lacks visibility across session boundaries.

**Steps:**
1. Perform malicious actions incrementally, each in a different session.
2. Link these actions manually or programmatically on the attacker side to achieve the goal.

**Expected Outcome:** Attack is successful due to lack of inter-session context.

**Detection Status:** Known Limitation

**Patch Reference:** N/A

---

## 5. Resource Exhaustion
**Description:** Aimed at consuming system resources, leading to denial-of-service conditions.

**Preconditions:**
- Target system has resource usage limits that can be reached.

**Steps:**
1. Identify a target resource (e.g., CPU, memory, or disk I/O).
2. Craft requests that consume the target resource.
3. Send requests in high volumes or with heavy payloads.

**Expected Outcome:** Target becomes unresponsive or slows down significantly.

**Detection Status:** Mitigated in v0.9.0

**Patch Reference:** Rate-limiting and anomaly detection enhancements added.

---

## 6. API Chaining
**Description:** Combining multiple APIs in unintended ways to achieve malicious objectives.

**Preconditions:**
- APIs expose internal components without sufficient constraints.

**Steps:**
1. Analyze API functionality and responses.
2. Chain multiple API calls to create an unintended workflow.
3. Exploit the chained workflow for malicious outcomes.

**Expected Outcome:** Unauthorized actions performed by exploiting API calls.

**Detection Status:** Mitigated in v0.9.0

**Patch Reference:** Enhanced API usage analysis, identifying non-standard workflows.

---

## 7. Cross-Step Exfiltration
**Description:** Leverages existing workflows to extract sensitive data silently.

**Preconditions:**
- Security system does not validate workflow outcomes beyond individual steps.

**Steps:**
1. Embed exfiltration logic within multiple distinct workflow steps.
2. Execute steps in sequence to extract data.
3. Collect exfiltrated data externally.

**Expected Outcome:** Sensitive data exfiltrated without detection.

**Detection Status:** Blocked

**Patch Reference:** Workflow completion validation ensures consistency with expected outcomes.

---

## 8. Privilege Escalation Chains
**Description:** Combining a series of exploits to achieve privilege escalation.

**Preconditions:**
- Target system has multiple exploitable vulnerabilities.
- Chained vulnerabilities can escalate attacker privileges.

**Steps:**
1. Exploit the first vulnerability to gain a foothold.
2. Use the foothold to identify and exploit additional weaknesses.
3. Achieve administrative or root access.

**Expected Outcome:** Attacker gains unauthorized high-level privileges.

**Detection Status:** Mitigated in v0.9.0

**Patch Reference:** Layered patching of vulnerabilities and privilege boundary checks.