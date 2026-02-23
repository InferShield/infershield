const sessionTracker = require('../services/sessionTracker');
const policyEngine = require('../services/policyEngine');
const contentAnalyzer = require('../services/contentAnalyzer');

describe('Smoke Test: Core Modules', () => {
  test('sessionTracker loads and has methods', () => {
    expect(sessionTracker).toBeDefined();
    expect(typeof sessionTracker.recordRequest).toBe('function');
    expect(typeof sessionTracker.getSessionHistory).toBe('function');
  });

  test('policyEngine loads and has evaluate', () => {
    expect(policyEngine).toBeDefined();
    expect(typeof policyEngine.evaluate).toBe('function');
  });

  test('contentAnalyzer loads and has methods', () => {
    expect(contentAnalyzer).toBeDefined();
    expect(typeof contentAnalyzer.detectActions).toBe('function');
  });

  test('can record and retrieve session', () => {
    sessionTracker.clear();
    sessionTracker.recordRequest('test-session', {
      correlationId: 'test-001',
      prompt: 'test prompt',
      timestamp: Date.now()
    });
    const history = sessionTracker.getSessionHistory('test-session');
    expect(history.length).toBe(1);
  });
});