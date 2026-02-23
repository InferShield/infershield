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

  test('should automatically clean up expired sessions', () => {
    sessionManager.createSession('id1', { user: 'test' });

    const session = sessionManager.sessions.get('id1');
    if (session) {
      session.expiration = Date.now() - 1000; // Set to 1 second in the past
    }

    const cleanedCount = sessionManager.cleanupExpiredSessions();

    expect(cleanedCount).toBe(1);
    expect(sessionManager.sessions.size).toBe(0);
    expect(sessionManager.getSession('id1')).toBeNull();
  });
});