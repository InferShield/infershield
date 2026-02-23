class SessionTracker {
  constructor() {
    this.sessions = new Map();
    // Schedule cleanup every 600 seconds (10 minutes)
    setInterval(() => this.cleanup(), 600 * 1000);
  }

  recordRequest(sessionId, requestEntry) {
    let session = this.sessions.get(sessionId) || {
      sessionId,
      requests: [],
      createdAt: Date.now(),
      lastAccessedAt: Date.now(),
    };

    // Maintain a maximum of 50 requests per session
    if (session.requests.length >= 50) {
      session.requests.shift();
    }

    session.requests.push(requestEntry);
    session.lastAccessedAt = Date.now();
    this.sessions.set(sessionId, session);
  }

  updateResponse(sessionId, correlationId, response, toolCalls) {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const request = session.requests.find(req => req.correlationId === correlationId);
    if (request) {
      request.response = response;
      request.toolCalls = toolCalls;
    }
    session.lastAccessedAt = Date.now(); // Update last accessed timestamp
  }

  getSessionHistory(sessionId) {
    const session = this.sessions.get(sessionId);
    return session ? session.requests : [];
  }

  getSessionStats(sessionId) {
    const session = this.sessions.get(sessionId);
    if (!session) return { requestCount: 0, maxRiskScore: 0, containsSensitiveData: false };

    let maxRiskScore = 0;
    let containsSensitiveData = false;

    session.requests.forEach(req => {
      if (req.riskScore > maxRiskScore) {
        maxRiskScore = req.riskScore;
      }
      if (req.containsSensitiveData) {
        containsSensitiveData = true;
      }
    });

    return {
      requestCount: session.requests.length,
      maxRiskScore,
      containsSensitiveData,
    };
  }

  cleanup() {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now - session.lastAccessedAt > 3600 * 1000) { // 1 hour
        this.sessions.delete(sessionId);
      }
    }
  }

  clear() {
    this.sessions.clear();
  }
}

const tracker = new SessionTracker();
module.exports = tracker;