# Proxy Updates for InferShield v0.3.1

## Changes Required

### 1. Update `logInteraction` Function

The proxy needs to send additional fields for compliance reporting:

**Current code** (proxy/server.js line ~20):
```javascript
async function logInteraction(prompt, response, analysis, agentId) {
  try {
    await axios.post(`${FIREWALL_ENDPOINT}/api/logs`, {
      agent_id: agentId,
      prompt: prompt.substring(0, 500),
      response: JSON.stringify(response).substring(0, 500),
      status: analysis.status,
      risk_score: analysis.risk_score,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Failed to log interaction:', error.message);
  }
}
```

**Updated code needed**:
```javascript
async function logInteraction(prompt, response, analysis, agentId, userId = null) {
  try {
    // Derive severity from risk_score
    let severity = 'low';
    if (analysis.risk_score >= 90) severity = 'critical';
    else if (analysis.risk_score >= 70) severity = 'high';
    else if (analysis.risk_score >= 40) severity = 'medium';

    // Determine policy_type from analysis
    const policy_type = analysis.violated_policies?.[0] || 
                       (analysis.status === 'blocked' ? 'policy_violation' : 'allowed');

    await axios.post(`${FIREWALL_ENDPOINT}/api/logs`, {
      agent_id: agentId,
      prompt: prompt.substring(0, 500),
      response: JSON.stringify(response).substring(0, 500),
      status: analysis.status,
      risk_score: analysis.risk_score,
      timestamp: new Date().toISOString(),
      // NEW FIELDS for compliance:
      policy_type: policy_type,
      severity: severity,
      user_id: userId, // Pass from auth if available
      metadata: {
        full_analysis: analysis,
        original_prompt_length: prompt.length
      }
    });
  } catch (error) {
    console.error('Failed to log interaction:', error.message);
  }
}
```

### 2. Backend Migration

Run the new migration to add compliance fields to audit_logs:

```bash
cd backend
npx knex migrate:latest
```

This adds: `timestamp`, `policy_type`, `severity`, `user_id`, `status`, `risk_score`, `agent_id` columns.

### 3. Backward Compatibility

The migration preserves existing data. Old logs without these fields will have NULL values, which the compliance system handles gracefully.

## Testing

After updating:

1. Send a test request through the proxy
2. Check that the log includes new fields:
   ```bash
   curl http://localhost:5000/api/logs | jq '.[0]'
   ```

Expected output should include:
```json
{
  "id": 1,
  "prompt": "...",
  "response": "...",
  "timestamp": "2026-02-21T21:00:00.000Z",
  "policy_type": "prompt_injection",
  "severity": "high",
  "user_id": null,
  "status": "blocked",
  "risk_score": 85,
  "agent_id": "test-agent",
  "metadata": {...},
  "created_at": "2026-02-21T21:00:00.000Z"
}
```

## Deployment Checklist

- [ ] Run migration: `npx knex migrate:latest`
- [ ] Update proxy/server.js with new logInteraction function
- [ ] Restart proxy service
- [ ] Verify logs have new fields
- [ ] Generate test compliance report
