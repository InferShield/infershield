/**
 * Prometheus Metrics for InferShield
 * 
 * Tracks:
 * - HTTP request duration (p50/p95/p99 latency)
 * - Request count by status code
 * - False positive rate
 * - Detection rate
 * - Blocked requests
 * - Redis operations
 */

const promClient = require('prom-client');

// Create a Registry for metrics
const register = new promClient.Registry();

// Add default metrics (CPU, memory, etc.)
promClient.collectDefaultMetrics({ register });

// ============================================
// HTTP Request Metrics
// ============================================

/**
 * HTTP Request Duration Histogram
 * Tracks latency distribution for p50/p95/p99 monitoring
 */
const httpRequestDuration = new promClient.Histogram({
  name: 'infershield_http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10], // 1ms to 10s
  registers: [register]
});

/**
 * HTTP Request Counter
 * Tracks total requests by method, route, and status
 */
const httpRequestsTotal = new promClient.Counter({
  name: 'infershield_http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});

// ============================================
// Security Detection Metrics
// ============================================

/**
 * Blocked Requests Counter
 * Tracks requests blocked by security policies
 */
const blockedRequestsTotal = new promClient.Counter({
  name: 'infershield_blocked_requests_total',
  help: 'Total number of blocked requests',
  labelNames: ['policy_name', 'reason'],
  registers: [register]
});

/**
 * Allowed Requests Counter
 * Tracks requests allowed through (not blocked)
 */
const allowedRequestsTotal = new promClient.Counter({
  name: 'infershield_allowed_requests_total',
  help: 'Total number of allowed requests',
  registers: [register]
});

/**
 * False Positive Rate Gauge
 * Tracks false positive rate as a percentage (0-100)
 */
const falsePositiveRate = new promClient.Gauge({
  name: 'infershield_false_positive_rate',
  help: 'False positive rate as percentage (0-100)',
  registers: [register]
});

/**
 * Detection Rate Gauge
 * Tracks detection rate as a percentage (0-100)
 */
const detectionRate = new promClient.Gauge({
  name: 'infershield_detection_rate',
  help: 'Detection rate as percentage (0-100)',
  registers: [register]
});

/**
 * Risk Score Distribution Histogram
 * Tracks distribution of risk scores
 */
const riskScoreDistribution = new promClient.Histogram({
  name: 'infershield_risk_score_distribution',
  help: 'Distribution of risk scores',
  buckets: [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  registers: [register]
});

// ============================================
// Redis Metrics
// ============================================

/**
 * Redis Operations Counter
 * Tracks Redis operations by type
 */
const redisOperationsTotal = new promClient.Counter({
  name: 'infershield_redis_operations_total',
  help: 'Total number of Redis operations',
  labelNames: ['operation', 'status'],
  registers: [register]
});

/**
 * Redis Operation Duration Histogram
 * Tracks Redis operation latency
 */
const redisOperationDuration = new promClient.Histogram({
  name: 'infershield_redis_operation_duration_seconds',
  help: 'Duration of Redis operations in seconds',
  labelNames: ['operation'],
  buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1], // 0.1ms to 100ms
  registers: [register]
});

/**
 * Active Sessions Gauge
 * Tracks number of active sessions in Redis
 */
const activeSessions = new promClient.Gauge({
  name: 'infershield_active_sessions',
  help: 'Number of active sessions',
  registers: [register]
});

// ============================================
// Uptime Metrics
// ============================================

/**
 * Uptime Gauge
 * Tracks server uptime in seconds
 */
const uptime = new promClient.Gauge({
  name: 'infershield_uptime_seconds',
  help: 'Server uptime in seconds',
  registers: [register]
});

// Update uptime every 10 seconds
const startTime = Date.now();
setInterval(() => {
  const uptimeSeconds = (Date.now() - startTime) / 1000;
  uptime.set(uptimeSeconds);
}, 10000);

// ============================================
// Helper Functions
// ============================================

/**
 * Middleware to track HTTP request metrics
 */
function trackHttpRequest(req, res, next) {
  const start = Date.now();
  
  // Intercept res.end to capture status code
  const originalEnd = res.end;
  res.end = function(...args) {
    const duration = (Date.now() - start) / 1000; // Convert to seconds
    const route = req.route?.path || req.path || 'unknown';
    const statusCode = res.statusCode;
    
    // Record metrics
    httpRequestDuration.labels(req.method, route, statusCode).observe(duration);
    httpRequestsTotal.labels(req.method, route, statusCode).inc();
    
    // Call original end
    originalEnd.apply(res, args);
  };
  
  next();
}

/**
 * Track blocked request
 */
function trackBlockedRequest(policyName, reason = 'security_policy') {
  blockedRequestsTotal.labels(policyName, reason).inc();
}

/**
 * Track allowed request
 */
function trackAllowedRequest() {
  allowedRequestsTotal.inc();
}

/**
 * Track risk score
 */
function trackRiskScore(score) {
  riskScoreDistribution.observe(score);
}

/**
 * Track Redis operation
 */
function trackRedisOperation(operation, duration, success = true) {
  const status = success ? 'success' : 'error';
  redisOperationsTotal.labels(operation, status).inc();
  redisOperationDuration.labels(operation).observe(duration);
}

/**
 * Update false positive rate
 * @param {number} rate - False positive rate as decimal (0-1)
 */
function updateFalsePositiveRate(rate) {
  falsePositiveRate.set(rate * 100); // Convert to percentage
}

/**
 * Update detection rate
 * @param {number} rate - Detection rate as decimal (0-1)
 */
function updateDetectionRate(rate) {
  detectionRate.set(rate * 100); // Convert to percentage
}

/**
 * Update active sessions count
 */
function updateActiveSessions(count) {
  activeSessions.set(count);
}

/**
 * Get metrics in Prometheus format
 */
async function getMetrics() {
  return register.metrics();
}

/**
 * Get metrics content type
 */
function getContentType() {
  return register.contentType;
}

// ============================================
// Exports
// ============================================

module.exports = {
  // Middleware
  trackHttpRequest,
  
  // Tracking functions
  trackBlockedRequest,
  trackAllowedRequest,
  trackRiskScore,
  trackRedisOperation,
  updateFalsePositiveRate,
  updateDetectionRate,
  updateActiveSessions,
  
  // Metrics export
  getMetrics,
  getContentType,
  
  // Raw metrics (for testing)
  metrics: {
    httpRequestDuration,
    httpRequestsTotal,
    blockedRequestsTotal,
    allowedRequestsTotal,
    falsePositiveRate,
    detectionRate,
    riskScoreDistribution,
    redisOperationsTotal,
    redisOperationDuration,
    activeSessions,
    uptime
  }
};
