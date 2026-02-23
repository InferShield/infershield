const SessionManager = require('../sessionManager');

describe('SessionManager', () => {
  let sessionManager;

  beforeEach(() => {
    sessionManager = new SessionManager({
      defaultTTL: 1000, // 1 second TTL
      cleanupInterval: 500, // 0.5 second interval
      maxSessions: 5,
    });
  });

  afterEach(() => {
    sessionManager.cleanup();
  });

  test('should create a session', () => {
    sessionManager.createSession('id1', { user: 'test' });
    const session = sessionManager.getSession('id1');
    expect(session).toEqual({ user: 'test' });
  });

  test('should expire sessions after TTL', (done) => {
    sessionManager.createSession('id1', { user: 'test' });
    setTimeout(() => {
      const session = sessionManager.getSession('id1');
      expect(session).toBeNull();
      done();
    }, 1500);
  });

  test('should automatically clean up expired sessions', (done) => {
    sessionManager.createSession('id1', { user: 'test' });
    setTimeout(() => {
      expect(sessionManager.sessions.size).toBe(0);
      done();
    }, 1500);
  });

  test('should not exceed maximum session limit', () => {
    // Listen for error events to prevent unhandled error
    const errors = [];
    sessionManager.events.on('error', (msg) => errors.push(msg));
    
    for (let i = 0; i < 6; i++) {
      sessionManager.createSession(`id${i}`, { user: `test${i}` });
    }
    expect(sessionManager.sessions.size).toBe(5);
    expect(errors).toEqual(['Session limit reached']);
  });

  test('should emit events for session lifecycle', () => {
    const events = [];
    sessionManager.events.on('sessionCreated', (e) => events.push({ event: 'created', ...e }));
    sessionManager.events.on('sessionEnded', (e) => events.push({ event: 'ended', ...e }));

    sessionManager.createSession('id1', { user: 'test' });
    sessionManager.endSession('id1');

    expect(events).toEqual([
      { event: 'created', sessionId: 'id1', expiration: expect.any(Number) },
      { event: 'ended', sessionId: 'id1' },
    ]);
  });

  test('should handle health checks', () => {
    for (let i = 0; i < 5; i++) {
      sessionManager.createSession(`id${i}`, { user: `test${i}` });
    }

    const healthStatus = sessionManager.healthCheck();
    expect(healthStatus).toBe(false);
  });
});