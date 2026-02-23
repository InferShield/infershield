const EventEmitter = require('events');

class SessionManager {
  constructor(options = {}) {
    this.sessions = new Map();
    this.options = {
      defaultTTL: options.defaultTTL || 3600000, // 1 hour default TTL
      cleanupInterval: options.cleanupInterval || 300000, // 5 minutes cleanup interval
      maxSessions: options.maxSessions || 1000, // Max session limit
    };
    this.events = new EventEmitter();
    this.cleanupExpiredSessions = this.cleanupExpiredSessions.bind(this);
    this.cleanupInterval = setInterval(this.cleanupExpiredSessions, this.options.cleanupInterval);
  }

  createSession(sessionId, data = {}) {
    const expiration = Date.now() + this.options.defaultTTL;
    const sessionData = { data, expiration };
    this.sessions.set(sessionId, sessionData);
  }

  getSession(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session || Date.now() > session.expiration) {
      this.sessions.delete(sessionId);
      return null;
    }
    return session.data;
  }

  cleanupExpiredSessions() {
    const currentTime = Date.now();
    let cleanedCount = 0;
    for (const [sessionId, session] of this.sessions.entries()) {
      if (currentTime > session.expiration) {
        this.sessions.delete(sessionId);
        cleanedCount++;
      }
    }
    return cleanedCount;
  }

  cleanup() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}

module.exports = SessionManager;