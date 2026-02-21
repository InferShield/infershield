const pino = require('pino');

/**
 * Structured JSON logger for InferShield
 * Outputs logs in JSON format for centralized logging (Loki, ELK, etc.)
 */

// Create base logger
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level: (label) => {
      return { level: label };
    }
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  base: {
    service: 'infershield-backend',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_VERSION || '0.4.0'
  }
});

/**
 * Create child logger with request context
 * @param {Object} req - Express request object
 * @returns {Object} - Pino logger instance
 */
function createRequestLogger(req) {
  return logger.child({
    requestId: req.id || generateRequestId(),
    method: req.method,
    path: req.path,
    userId: req.user?.id,
    ipAddress: req.ip
  });
}

/**
 * Generate unique request ID
 */
function generateRequestId() {
  return `req-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Log HTTP request
 */
function logRequest(req, res, duration) {
  const log = createRequestLogger(req);
  
  const logData = {
    action: 'http.request',
    method: req.method,
    path: req.path,
    statusCode: res.statusCode,
    duration,
    userAgent: req.get('user-agent'),
    referer: req.get('referer')
  };

  if (res.statusCode >= 500) {
    log.error(logData, 'HTTP request failed');
  } else if (res.statusCode >= 400) {
    log.warn(logData, 'HTTP request error');
  } else {
    log.info(logData, 'HTTP request completed');
  }
}

/**
 * Log report generation
 */
function logReportGeneration(userId, reportId, framework, format, duration, cached, success) {
  logger.info({
    action: 'report.generated',
    userId,
    reportId,
    framework,
    format,
    duration,
    cached,
    success
  }, `Report ${success ? 'generated' : 'generation failed'}: ${framework} ${format}`);
}

/**
 * Log policy violation
 */
function logPolicyViolation(userId, policyType, severity, action, metadata = {}) {
  logger.warn({
    action: 'policy.violation',
    userId,
    policyType,
    severity,
    policyAction: action,
    metadata
  }, `Policy violation: ${policyType} (${severity}) - ${action}`);
}

/**
 * Log authentication event
 */
function logAuth(action, userId, success, reason = null, ipAddress = null) {
  const logData = {
    action: `auth.${action}`,
    userId,
    success,
    reason,
    ipAddress
  };

  if (success) {
    logger.info(logData, `Authentication ${action} succeeded`);
  } else {
    logger.warn(logData, `Authentication ${action} failed: ${reason}`);
  }
}

/**
 * Log database query
 */
function logDbQuery(queryType, duration, rowCount = null, error = null) {
  const logData = {
    action: 'db.query',
    queryType,
    duration,
    rowCount
  };

  if (error) {
    logger.error({ ...logData, error: error.message }, `Database query failed: ${queryType}`);
  } else if (duration > 1000) {
    logger.warn(logData, `Slow database query: ${queryType} (${duration}ms)`);
  } else {
    logger.debug(logData, `Database query: ${queryType}`);
  }
}

/**
 * Log cache operation
 */
function logCacheOp(operation, key, hit = null, duration = null) {
  logger.debug({
    action: 'cache.operation',
    operation,
    key,
    hit,
    duration
  }, `Cache ${operation}: ${key}`);
}

/**
 * Log error with stack trace
 */
function logError(error, context = {}) {
  logger.error({
    action: 'error',
    error: {
      message: error.message,
      stack: error.stack,
      name: error.name
    },
    ...context
  }, error.message);
}

/**
 * Log security event
 */
function logSecurity(event, severity, userId = null, metadata = {}) {
  logger.warn({
    action: 'security.event',
    event,
    severity,
    userId,
    metadata
  }, `Security event: ${event}`);
}

/**
 * Express middleware for request logging
 */
function requestLoggingMiddleware(req, res, next) {
  // Generate request ID
  req.id = generateRequestId();
  
  // Attach logger to request
  req.log = createRequestLogger(req);
  
  // Track request start time
  const start = Date.now();
  
  // Log when response finishes
  res.on('finish', () => {
    const duration = Date.now() - start;
    logRequest(req, res, duration);
  });
  
  next();
}

module.exports = {
  logger,
  createRequestLogger,
  logRequest,
  logReportGeneration,
  logPolicyViolation,
  logAuth,
  logDbQuery,
  logCacheOp,
  logError,
  logSecurity,
  requestLoggingMiddleware
};
