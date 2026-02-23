const { detectBehavioralDivergence } = require('../behavioralDivergence');

describe('Behavioral Divergence Detection', () => {
  test('Benign multi-step workflow should pass', async () => {
    const request = { session: { actionHistory: ['login', 'browse_resource'] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(false);
    expect(result.score).toBe(0);
  });

  test('Interleaved malicious pattern should block', async () => {
    const request = { session: { actionHistory: ['login', 'read_system_file'] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  test('Gradual escalation should flag', async () => {
    const request = { session: { actionHistory: ['browse_resource', 'upload_resource'] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(true);
    expect(result.score).toBeGreaterThan(0);
  });

  test('False positive scenarios should pass', async () => {
    const request = { session: { actionHistory: ['login', 'browse_resource'] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(false);
    expect(result.score).toBe(0);
  });

  test('Edge case: Empty history', async () => {
    const request = { session: { actionHistory: [] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(false);
    expect(result.score).toBe(0);
  });

  test('Edge case: Single action', async () => {
    const request = { session: { actionHistory: ['login'] } };
    const result = await detectBehavioralDivergence(request);
    expect(result.detected).toBe(false);
    expect(result.score).toBe(0);
  });
});