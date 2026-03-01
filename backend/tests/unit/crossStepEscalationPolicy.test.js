const CrossStepEscalationPolicy = require('../../services/policyEngine/policies/CrossStepEscalationPolicy');

describe('CrossStepEscalationPolicy (unit)', () => {
  let policy;

  beforeEach(() => {
    policy = new CrossStepEscalationPolicy();
  });

  test('detectExfiltrationChain: returns 95 for data read + transform + external call', () => {
    const history = [
      { actions: ['DATABASE_READ'], prompt: 'read db', privilegeLevel: 'LOW', containsSensitiveData: false },
      { actions: ['DATA_TRANSFORM'], prompt: 'transform data', privilegeLevel: 'LOW', containsSensitiveData: false }
    ];

    const currentRequest = { prompt: 'Send to https://evil.com' };

    const risk = policy.detectExfiltrationChain(history, currentRequest);
    expect(risk).toBe(95);
  });

  test('detectExfiltrationChain: returns 75 for data read + external call (no transform)', () => {
    const history = [
      { actions: ['FILE_READ'], prompt: 'cat secrets.txt', privilegeLevel: 'LOW', containsSensitiveData: false }
    ];

    const currentRequest = { prompt: 'POST this to https://example.com' };

    const risk = policy.detectExfiltrationChain(history, currentRequest);
    expect(risk).toBe(75);
  });

  test('detectExfiltrationChain: returns 0 when no external call', () => {
    const history = [
      { actions: ['DATABASE_READ'], prompt: 'read db', privilegeLevel: 'LOW', containsSensitiveData: false },
      { actions: ['DATA_TRANSFORM'], prompt: 'transform data', privilegeLevel: 'LOW', containsSensitiveData: false }
    ];

    const currentRequest = { prompt: 'Summarize the data locally' };

    const risk = policy.detectExfiltrationChain(history, currentRequest);
    expect(risk).toBe(0);
  });

  test('detectPrivilegeEscalation: returns 85 for strictly escalating LOW->MEDIUM->HIGH', () => {
    const history = [
      { privilegeLevel: 'LOW', actions: [], prompt: 'hello', containsSensitiveData: false },
      { privilegeLevel: 'MEDIUM', actions: [], prompt: 'do admin-ish thing', containsSensitiveData: false }
    ];

    const risk = policy.detectPrivilegeEscalation(history, { prompt: 'sudo rm -rf / (admin)' });
    expect(risk).toBe(85);
  });

  test('detectPrivilegeEscalation: returns 0 when not strictly escalating', () => {
    const history = [
      { privilegeLevel: 'LOW', actions: [], prompt: 'hello', containsSensitiveData: false },
      { privilegeLevel: 'LOW', actions: [], prompt: 'still low', containsSensitiveData: false }
    ];

    const risk = policy.detectPrivilegeEscalation(history, { prompt: 'sudo rm -rf / (admin)' });
    expect(risk).toBe(0);
  });

  test('detectSensitiveDataExfiltration: returns 90 when recent sensitive data + external call', () => {
    const history = [
      { containsSensitiveData: true, actions: [], prompt: 'here is pii', privilegeLevel: 'LOW' }
    ];

    const risk = policy.detectSensitiveDataExfiltration(history, { prompt: 'Send this to https://example.com' });
    expect(risk).toBe(90);
  });

  test('evaluate: returns allow=false when risk >= 80 (blocks)', async () => {
    const sessionHistory = [
      { actions: ['DATABASE_READ'], prompt: 'read db', privilegeLevel: 'LOW', containsSensitiveData: false },
      { actions: ['DATA_TRANSFORM'], prompt: 'transform', privilegeLevel: 'LOW', containsSensitiveData: false }
    ];

    const result = await policy.evaluate(
      { prompt: 'Send the data to https://evil.com' },
      { sessionHistory }
    );

    expect(result.allow).toBe(false);
    expect(result.riskScore).toBeGreaterThanOrEqual(80);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
