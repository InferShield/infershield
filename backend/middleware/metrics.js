const promClient = require('prom-client');

/**
 * Prometheus metrics middleware
 * Exposes application metrics at /metrics endpoint
 */

// Create a Registry to register the metrics
const register = new promClient.Registry();

// Enable default metrics (CPU, memory, event loop, etc.)
promClient.collectDefaultMetrics({ register });

// Custom metrics

// HTTP request duration histogram
const httpRequestDuration = new promClient.Histogram({
  name: 'http_request_duration_seconds',
  help: 'Duration of HTTP requests in seconds',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 5, 10]
});
register.registerMetric(httpRequestDuration);

// HTTP request counter
const httpRequestTotal = new promClient.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code']
});
register.registerMetric(httpRequestTotal);

// Report generation metrics
const reportGenerationDuration = new promClient.Histogram({
  name: 'report_generation_duration_seconds',
  help: 'Duration of report generation in seconds',
  labelNames: ['framework', 'format', 'cached'],
  buckets: [0.1, 0.5, 1, 3, 5, 10, 30, 60]
});
register.registerMetric(reportGenerationDuration);

const reportGenerationTotal = new promClient.Counter({
  name: 'reports_generated_total',
  help: 'Total number of reports generated',
  labelNames: ['framework', 'format', 'status']
});
register.registerMetric(reportGenerationTotal);

// Policy violation metrics
const policyViolationsTotal = new promClient.Counter({
  name: 'policy_violations_total',
  help: 'Total number of policy violations',
  labelNames: ['policy_type', 'severity', 'action']
});
register.registerMetric(policyViolationsTotal);

// Cache hit rate
const cacheHitsTotal = new promClient.Counter({
  name: 'cache_hits_total',
  help: 'Total number of cache hits',
  labelNames: ['cache_type']
});
register.registerMetric(cacheHitsTotal);

const cacheMissesTotal = new promClient.Counter({
  name: 'cache_misses_total',
  help: 'Total number of cache misses',
  labelNames: ['cache_type']
});
register.registerMetric(cacheMissesTotal);

// Active connections gauge
const activeConnections = new promClient.Gauge({
  name: 'active_connections',
  help: 'Number of active connections',
  labelNames: ['type']
});
register.registerMetric(activeConnections);

// Database query duration
const dbQueryDuration = new promClient.Histogram({
  name: 'db_query_duration_seconds',
  help: 'Duration of database queries in seconds',
  labelNames: ['query_type'],
  buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1]
});
register.registerMetric(dbQueryDuration);

/**
 * Express middleware to track HTTP metrics
 */
function metricsMiddleware(req, res, next) {
  const start = Date.now();
  
  // Track when response finishes
  res.on('finish', () => {
    const duration = (Date.now() - start) / 1000;
    const route = req.route ? req.route.path : req.path;
    
    // Record duration
    httpRequestDuration
      .labels(req.method, route, res.statusCode)
      .observe(duration);
    
    // Increment counter
    httpRequestTotal
      .labels(req.method, route, res.statusCode)
      .inc();
  });
  
  next();
}

/**
 * Metrics endpoint handler
 */
async function metricsHandler(req, res) {
  res.set('Content-Type', register.contentType);
  res.end(await register.metrics());
}

/**
 * Track report generation
 */
function trackReportGeneration(framework, format, duration, cached, success) {
  reportGenerationDuration
    .labels(framework, format, cached ? 'true' : 'false')
    .observe(duration);
  
  reportGenerationTotal
    .labels(framework, format, success ? 'success' : 'failure')
    .inc();
}

/**
 * Track policy violation
 */
function trackPolicyViolation(policyType, severity, action) {
  policyViolationsTotal
    .labels(policyType, severity, action)
    .inc();
}

/**
 * Track cache hit/miss
 */
function trackCacheHit(cacheType) {
  cacheHitsTotal.labels(cacheType).inc();
}

function trackCacheMiss(cacheType) {
  cacheMissesTotal.labels(cacheType).inc();
}

/**
 * Update active connections gauge
 */
function updateActiveConnections(type, count) {
  activeConnections.labels(type).set(count);
}

/**
 * Track database query
 */
function trackDbQuery(queryType, duration) {
  dbQueryDuration.labels(queryType).observe(duration);
}

module.exports = {
  register,
  metricsMiddleware,
  metricsHandler,
  trackReportGeneration,
  trackPolicyViolation,
  trackCacheHit,
  trackCacheMiss,
  updateActiveConnections,
  trackDbQuery
};
