const EventEmitter = require('events');

class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.sessionsInfo = {
      active: 0,
      memoryUsed: 0
    };

    this.options = {
      defaultTTL: options.defaultTTL || 3600000, // 1 hour default TTL in ms
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes default interval
      maxSessions: options.maxSessions || 1000 // Max session limit
    };

    this.events = new EventEmitter();

    this.cleanupExpiredSessions();
    this.cleanupIntervalID = setInterval(
      () => this.cleanupExpiredSessions(),
      this.options.cleanupInterval
    );
  }

  createSession(sessionId, data = {}) {
    if (this.sessions.size >= this.options.maxSessions) {
      this.events.emit('error', 'Session limit reached');
      return null;
    }

    const currentTime = Date.now();
    const expiration = currentTime + this.options.defaultTTL;

    const sessionData = {
      data,
      expiration,
    };

    this.sessions.set(sessionId, sessionData);
    this.sessionsInfo.active++;
    this.sessionsInfo.memoryUsed += JSON.stringify(sessionData).length;
    this.events.emit('sessionCreated', { sessionId, expiration });
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (!session) return null;

    if (Date.now() > session.expiration) {
      this.endSession(sessionId);
      return null;
    }

    return session.data;
  }

  endSession(sessionId) {
    const session = this.sessions.get(sessionId);

    if (session) {
      this.sessions.delete(sessionId);
      this.sessionsInfo.active--;
      this.sessionsInfo.memoryUsed -= JSON.stringify(session).length;
      this.events.emit('sessionEnded', { sessionId });
    }
  }

  cleanupExpiredSessions() {
    const currentTime = Date.now();
    let cleanedCount = 0;

    for (const [sessionId, session] of this.sessions.entries()) {
      if (currentTime > session.expiration) {
        this.endSession(sessionId);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.events.emit('cleanup', { cleanedCount });
    }
  }

  logSessionMetrics() {
    this.events.emit('sessionMetrics', this.sessionsInfo);
  }

  healthCheck() {
    const issues = [];
    if (this.sessions.size >= this.options.maxSessions) {
      issues.push('Reached maximum session capacity!');
    }
    this.events.emit('healthCheck', { issues });
    return issues.length === 0;
  }

  cleanup() {
    clearInterval(this.cleanupIntervalID);
    this.sessions.clear();
    this.sessionsInfo.active = 0;
    this.sessionsInfo.memoryUsed = 0;
    this.events.emit('managerShutdown');
  }
}

module.exports = SessionManager;