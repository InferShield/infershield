const crypto = require('crypto');

function generateSessionId(req) {
  if (req.headers['x-session-id']) {
    return req.headers['x-session-id'];
  }

  const userAgent = req.headers['user-agent'] || '';
  const ip = req.ip || req.connection.remoteAddress || '';
  return crypto.createHash('sha256').update(userAgent + ip).digest('hex');
}

function generateCorrelationId() {
  return crypto.randomUUID();
}

module.exports = (req, res, next) => {
  const sessionId = generateSessionId(req);
  const correlationId = generateCorrelationId();

  req.context = { sessionId, correlationId };

  next();
};