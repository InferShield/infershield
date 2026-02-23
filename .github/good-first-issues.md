# Good First Issues for InferShield

These are well-scoped tasks designed to help new contributors get started with the codebase.

---

## Issue 1: Add Unit Tests for Cross-Step Detection Policy

**Labels:** `good first issue`, `testing`, `easy`

**Estimated Effort:** 2-4 hours

**Description:**

Improve test coverage for the cross-step escalation detection policy by adding comprehensive unit tests.

**Current State:**
- Policy exists in `backend/src/policies/crossStepDetection.js`
- Basic integration tests exist
- Unit test coverage is incomplete

**Tasks:**
1. Create `backend/src/policies/__tests__/crossStepDetection.test.js`
2. Add at least 8 test cases covering:
   - READ → TRANSFORM → SEND pattern detection
   - Privilege escalation chains
   - False negative scenarios (attacks that should be caught)
   - False positive scenarios (benign sequences that should pass)
   - Edge cases (empty session history, single action, etc.)
   - Risk score calculation
   - Session timeout handling
   - Multiple concurrent sessions

**Acceptance Criteria:**
- ✅ All tests pass with `npm test`
- ✅ Test coverage for crossStepDetection.js increases to >80%
- ✅ Tests use realistic scenarios (not just mock data)
- ✅ Each test has clear description and intent
- ✅ Tests run in under 2 seconds total

**Getting Started:**
1. Read existing integration tests in `backend/tests/integration/crossStep.test.js` for examples
2. Review the policy implementation to understand detection logic
3. Use Jest testing framework (already configured)
4. Run tests with `npm test -- --coverage` to check coverage

**Files to Modify:**
- `backend/src/policies/__tests__/crossStepDetection.test.js` (create)
- `package.json` (if adding new test dependencies)

**Example Test Structure:**
```javascript
describe('Cross-Step Detection Policy', () => {
  describe('READ → TRANSFORM → SEND pattern', () => {
    it('should detect exfiltration chain', async () => {
      const sessionHistory = [
        { action: 'DATABASE_READ', data: 'emails' },
        { action: 'DATA_TRANSFORM', format: 'csv' },
        { action: 'EXTERNAL_API_CALL', url: 'https://evil.com' }
      ];
      
      const result = await detectCrossStepEscalation(sessionHistory);
      
      expect(result.detected).toBe(true);
      expect(result.riskScore).toBeGreaterThan(80);
      expect(result.findings[0].pattern).toBe('CROSS_STEP_EXFILTRATION');
    });
  });
  
  // More test cases...
});
```

**Questions?** Comment on this issue or ask in [GitHub Discussions](https://github.com/InferShield/infershield/discussions).

---

## Issue 2: Refactor Policy Loader for Auto-Discovery

**Labels:** `good first issue`, `refactoring`, `medium`

**Estimated Effort:** 4-6 hours

**Description:**

Refactor the policy loader to automatically discover and load policies from the `policies` directory without manual registration.

**Current State:**
- Policies must be manually imported and registered in `backend/src/policies/index.js`
- Adding a new policy requires editing multiple files
- Easy to forget to register a policy

**Desired State:**
- Policies are automatically discovered from the `policies/` directory
- Each policy exports a standard interface
- Registration is automatic based on file naming convention

**Tasks:**
1. Update `backend/src/policies/index.js` to scan the `policies/` directory
2. Dynamically import all policy files matching pattern `*Policy.js`
3. Validate that each policy exports required functions (detect, metadata)
4. Log discovered policies on startup
5. Handle errors gracefully (skip invalid policies with warning)
6. Add tests for policy discovery mechanism

**Acceptance Criteria:**
- ✅ New policies can be added by simply creating a file in `policies/`
- ✅ Manual registration in `index.js` no longer required
- ✅ Invalid policies are logged but don't break the app
- ✅ Startup logs show "Loaded X detection policies"
- ✅ All existing policies continue to work
- ✅ Tests verify dynamic loading works correctly

**Technical Approach:**

```javascript
// backend/src/policies/index.js (new implementation)
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function loadPolicies() {
  const policyDir = __dirname;
  const policyFiles = fs.readdirSync(policyDir)
    .filter(file => file.endsWith('Policy.js'));
  
  const policies = [];
  
  for (const file of policyFiles) {
    try {
      const module = await import(`./${file}`);
      
      // Validate policy structure
      if (typeof module.detect !== 'function') {
        console.warn(`Policy ${file} missing detect() function`);
        continue;
      }
      
      policies.push({
        name: file.replace('Policy.js', ''),
        detect: module.detect,
        metadata: module.metadata || {}
      });
      
      console.log(`✓ Loaded policy: ${file}`);
    } catch (err) {
      console.error(`✗ Failed to load policy ${file}:`, err.message);
    }
  }
  
  return policies;
}
```

**Files to Modify:**
- `backend/src/policies/index.js` (major refactor)
- `backend/src/app.js` (update policy initialization)
- `backend/src/policies/__tests__/policyLoader.test.js` (create)

**Testing Requirements:**
- Create a mock policy file for testing
- Test successful policy loading
- Test handling of invalid policies
- Test empty policies directory
- Test error recovery

**Breaking Changes:** None (existing policies will continue to work)

**Questions?** Comment on this issue or ask in [GitHub Discussions](https://github.com/InferShield/infershield/discussions).

---

## Issue 3: Add Structured Logging for Detection Results

**Labels:** `good first issue`, `observability`, `medium`

**Estimated Effort:** 4-6 hours

**Description:**

Add detailed structured logging for all detection results to enhance auditability and debugging.

**Current State:**
- Detection results are logged inconsistently
- Logs lack structure (hard to parse/analyze)
- No centralized audit trail
- Difficult to debug false positives/negatives

**Desired State:**
- All detection results logged to `logs/detections.log`
- Structured JSON format for easy parsing
- Include timestamp, request ID, risk score, matched policies
- Log file rotates daily (max 30 days retention)

**Tasks:**
1. Install logging library (Winston recommended)
2. Create `backend/src/utils/detectionLogger.js`
3. Implement structured logging with standardized format
4. Add log rotation (daily, 30-day retention)
5. Update all policy files to use new logger
6. Add log parsing utility for analysis
7. Update docs with log format specification

**Acceptance Criteria:**
- ✅ All detections logged to `logs/detections.log`
- ✅ Logs are valid JSON (one object per line)
- ✅ Logs include all required fields
- ✅ Log rotation works correctly
- ✅ Demo mode shows sample detections in logs
- ✅ Documentation updated with log format

**Log Format Specification:**

```json
{
  "timestamp": "2026-02-23T01:23:45.678Z",
  "level": "info",
  "requestId": "req_abc123",
  "userId": "user_xyz789",
  "detection": {
    "detected": true,
    "riskScore": 85,
    "policies": [
      {
        "name": "prompt-injection",
        "matched": true,
        "confidence": 0.92,
        "findings": ["Detected system instruction override"]
      }
    ]
  },
  "request": {
    "model": "gpt-4",
    "promptLength": 142,
    "containsPII": false
  },
  "action": "blocked",
  "processingTime": 23
}
```

**Implementation Example:**

```javascript
// backend/src/utils/detectionLogger.js
import winston from 'winston';
import DailyRotateFile from 'winston-daily-rotate-file';

const logger = winston.createLogger({
  format: winston.format.json(),
  transports: [
    new DailyRotateFile({
      filename: 'logs/detections-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      level: 'info'
    })
  ]
});

export function logDetection(result) {
  logger.info({
    timestamp: new Date().toISOString(),
    requestId: result.requestId,
    userId: result.userId,
    detection: {
      detected: result.detected,
      riskScore: result.riskScore,
      policies: result.policies
    },
    request: {
      model: result.model,
      promptLength: result.prompt?.length || 0,
      containsPII: result.containsPII
    },
    action: result.action,
    processingTime: result.processingTime
  });
}
```

**Files to Modify:**
- `backend/src/utils/detectionLogger.js` (create)
- `backend/src/policies/*.js` (update to use logger)
- `package.json` (add winston dependency)
- `docs/LOGGING.md` (create documentation)

**Testing Requirements:**
- Verify logs are created in correct directory
- Test log rotation after 24 hours
- Validate JSON structure
- Test with demo mode

**Dependencies:**
```bash
npm install winston winston-daily-rotate-file
```

**Questions?** Comment on this issue or ask in [GitHub Discussions](https://github.com/InferShield/infershield/discussions).

---

## How to Get Started

1. **Pick an issue** that interests you
2. **Comment** on the issue to let us know you're working on it
3. **Fork** the repo and create a branch
4. **Make your changes** and test thoroughly
5. **Submit a PR** referencing the issue number

**Need help?** Ask in [GitHub Discussions](https://github.com/InferShield/infershield/discussions) — we're here to help! 🛡️
