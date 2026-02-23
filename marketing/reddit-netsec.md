# r/netsec Post

**Title:** Orchestration-Layer Attack Detection via Session Correlation: A Proof of Concept

**Body:**

Orchestration-layer attacks are an emerging threat, leveraging vulnerabilities in APIs, cloud management systems, and container orchestration platforms. These attacks often exploit high-level control planes to evade traditional detection mechanisms designed for endpoint or network layers.

InferShield, a new open-source Proof of Concept, explores a lightweight, rule-based approach to detecting such attacks. It focuses on session tracking and activity correlation at the orchestration level, analyzing in-memory events to identify suspicious patterns.

**Architecture Overview:**  
InferShield operates as a middleware layer, capturing session-level data based on API calls or task execution logs. It correlates events across multiple sessions using configurable heuristic rules, flagging sequences that deviate from legitimate workflows.

**Example Attack:**  
1. **Recon Phase**: An attacker deploys a malicious automation script to list accessible API methods and inspect an organization's cloud setup.  
2. **Privilege Escalation**: The attacker exploits misconfigured role bindings to gain administrative control.  
3. **Infrastructure Takeover**: Using elevated privileges, the attacker modifies deployment manifests to inject backdoors in container images or disrupt critical workloads.

InferShield can detect irregular event sequences (e.g., privilege escalation followed by suspicious configurations) by aggregating session-level data and alerting on behavioral anomalies.

**Limitations:**  
- **Memory-Resident**: InferShield tracks events only in memory, which limits scalability for large clusters.  
- **Rule-Based**: Detection accuracy depends on pre-defined rules; it is not fully adaptive.  
- **POC Status**: The tool is experimental and not production-ready.

**Discussion Prompt:**  
What additional techniques (e.g., machine learning, distributed tracing) could enhance detection at the orchestration layer?

**Repo Link:**  
https://github.com/InferShield/infershield
