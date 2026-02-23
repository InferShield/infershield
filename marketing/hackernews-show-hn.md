# Hacker News Show HN Post

**Title:** Show HN: InferShield – A Lightweight Orchestration-Layer Attack Detector (POC)

**Body:**

Attacks targeting the orchestration layer (e.g., Kubernetes control planes, cloud APIs) are stealthy and often bypass conventional security mechanisms. These attacks can exploit API misconfigurations, escalate privileges, and compromise infrastructure.

We built InferShield, an open-source Proof of Concept, to explore early detection of such threats. InferShield uses session tracking and event correlation to identify abnormal sequences of orchestration-layer activity.

**Example Attack Detection:**  
- An attacker uses a compromised API token to inspect deployment configurations, escalate privileges via role misconfiguration, and push modified manifests to introduce malicious containers. InferShield alerts by recognizing the unusual API call sequence.

**Limitations:**  
- It's in-memory only, which limits scalability.  
- Detection is limited to rule-based patterns and cannot adapt to unknown attack vectors.  
- This is an experimental tool and should be treated as a starting point, not a solution.

**What We're Looking For:**  
We're seeking feedback, contributors for further development, and insights from security researchers on how to strengthen this approach.

**Repo Link:**  
https://github.com/InferShield/infershield
