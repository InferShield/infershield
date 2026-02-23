# Issue 3: Add Structured Logging for Detection Results

**Labels:** `enhancement`, `logging`, `observability`, `good-first-issue`

## Problem Statement

Detection results are currently logged inconsistently using `console.log()`. This makes it difficult to:
- Parse logs programmatically
- Integrate with SIEM systems
- Debug false positives/negatives
- Analyze patterns over time

Structured JSON logging would enable better observability and downstream analysis.

## Proposed Approach

1. Install Winston (or similar structured logging library)
2. Create `backend/src/utils/detectionLogger.js`
3. Define standard log format:
   ```javascript
   {
     timestamp: "2026-02-23T02:00:00.000Z",
     level: "info",
     requestId: "req_abc123",
     userId: "user_xyz",
     detection: {
       detected: true,
       riskScore: 85,
       policies: [
         { name: "cross-step-exfiltration", matched: true, confidence: 0.92 }
       ]
     },
     action: "blocked",
     processingTimeMs: 23
   }
   ```
4. Add log rotation (daily, 30-day retention)
5. Replace all `console.log()` calls in detection path
6. Add tests to verify log structure

## Acceptance Criteria

- [ ] All detection results logged to `logs/detections.log` in JSON format
- [ ] Logs include: timestamp, requestId, userId, riskScore, action, processingTime
- [ ] Log rotation works (daily files, max 30 days)
- [ ] No `console.log()` remains in detection code paths
- [ ] Demo mode shows example detections in logs
- [ ] Documentation added for log format

## Estimated Complexity

6-10 hours

## Files to Modify

- `backend/src/utils/detectionLogger.js` (create)
- `backend/src/policies/*.js` (replace console.log calls)
- `backend/src/middleware/proxy.js` (integrate logger)
- `package.json` (add winston dependency)
- `docs/LOGGING.md` (create)

## Dependencies

```bash
npm install winston winston-daily-rotate-file
```

## Technical Notes

Use `winston.format.json()` for structured output. Ensure sensitive data (PII, API keys) is not logged in plaintext.
