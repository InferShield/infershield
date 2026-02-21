# InferShield Centralized Logging

Structured JSON logging with Loki aggregation for production observability.

## Overview

### Architecture

**Components:**
1. **Pino Logger** - Fast, structured JSON logging in Node.js
2. **Loki** - Log aggregation and storage (30-day retention)
3. **Promtail** - Log collector (DaemonSet on every node)
4. **Grafana** - Query interface and log exploration

**Data Flow:**
```
InferShield Pod → stdout (JSON) → Promtail → Loki → Grafana
```

### Log Format

All logs are emitted as structured JSON:

```json
{
  "timestamp": "2024-02-21T23:30:00.000Z",
  "level": "info",
  "service": "infershield-backend",
  "environment": "production",
  "version": "0.4.0",
  "requestId": "req-1708560600-abc123",
  "method": "POST",
  "path": "/api/reports",
  "userId": "user-456",
  "ipAddress": "10.0.1.42",
  "action": "http.request",
  "statusCode": 201,
  "duration": 1234,
  "msg": "HTTP request completed"
}
```

## Logger API

### Import

```javascript
const {
  logger,
  logReportGeneration,
  logPolicyViolation,
  logAuth,
  logDbQuery,
  logError,
  requestLoggingMiddleware
} = require('./utils/logger');
```

### Basic Logging

```javascript
logger.info('Application started');
logger.warn({ userId: '123' }, 'Rate limit approaching');
logger.error({ error: err.message }, 'Database connection failed');
```

### HTTP Request Logging

Automatic via middleware:

```javascript
const { requestLoggingMiddleware } = require('./utils/logger');
app.use(requestLoggingMiddleware);
```

Logs every request with:
- Request ID (auto-generated)
- Method, path, status code
- Duration (ms)
- User ID (if authenticated)
- IP address

### Report Generation Logging

```javascript
const { logReportGeneration } = require('./utils/logger');

logReportGeneration(
  'user-123',        // userId
  'report-456',      // reportId
  'SOC2',            // framework
  'pdf',             // format
  2500,              // duration (ms)
  false,             // cached
  true               // success
);
```

### Policy Violation Logging

```javascript
const { logPolicyViolation } = require('./utils/logger');

logPolicyViolation(
  'user-123',           // userId
  'prompt_injection',   // policyType
  'high',               // severity
  'blocked',            // action
  { riskScore: 85 }     // metadata (optional)
);
```

### Authentication Logging

```javascript
const { logAuth } = require('./utils/logger');

logAuth('login', 'user-123', true, null, '10.0.1.42');
logAuth('login', 'user-456', false, 'invalid_password', '10.0.1.42');
```

### Database Query Logging

```javascript
const { logDbQuery } = require('./utils/logger');

const start = Date.now();
const result = await db.query(sql);
logDbQuery('select_reports', Date.now() - start, result.rows.length);
```

### Error Logging

```javascript
const { logError } = require('./utils/logger');

try {
  // ... code
} catch (error) {
  logError(error, {
    userId: 'user-123',
    action: 'report.generation'
  });
}
```

### Security Event Logging

```javascript
const { logSecurity } = require('./utils/logger');

logSecurity(
  'unauthorized_access_attempt',
  'high',
  'user-123',
  { resource: '/api/admin', method: 'GET' }
);
```

## Installation

### 1. Deploy Loki

```bash
kubectl apply -f k8s/logging/loki-config.yaml
```

This creates:
- Loki StatefulSet (1 replica, 10Gi storage)
- Loki Service (ClusterIP on port 3100)
- ConfigMap with Loki configuration

### 2. Deploy Promtail

```bash
kubectl apply -f k8s/logging/promtail-config.yaml
```

This creates:
- Promtail DaemonSet (runs on every node)
- ServiceAccount + RBAC permissions
- ConfigMap with Promtail configuration

### 3. Add Loki Datasource to Grafana

```bash
# Port-forward Grafana
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

In Grafana (http://localhost:3000):
1. Go to Configuration → Data Sources
2. Add data source → Loki
3. URL: `http://loki.monitoring.svc.cluster.local:3100`
4. Save & Test

### 4. Add Logger to Application

Update `backend/package.json`:

```json
{
  "dependencies": {
    "pino": "^8.16.0"
  }
}
```

Update `backend/server.js`:

```javascript
const { requestLoggingMiddleware } = require('./utils/logger');

app.use(requestLoggingMiddleware);
```

## Querying Logs

### Grafana Explore

1. Open Grafana → Explore
2. Select Loki datasource
3. Use LogQL to query logs

### Example Queries

**All logs from infershield namespace:**
```logql
{namespace="infershield"}
```

**Error logs only:**
```logql
{namespace="infershield"} |= "error"
```

**HTTP requests with status 5xx:**
```logql
{namespace="infershield"} | json | statusCode >= 500
```

**Slow requests (>1s):**
```logql
{namespace="infershield"} | json | duration > 1000
```

**Report generation failures:**
```logql
{namespace="infershield"} | json | action="report.generated" | success="false"
```

**Policy violations by user:**
```logql
{namespace="infershield"} | json | action="policy.violation" | userId="user-123"
```

**Authentication failures:**
```logql
{namespace="infershield"} | json | action=~"auth.*" | success="false"
```

**Logs for specific request:**
```logql
{namespace="infershield"} | json | requestId="req-1708560600-abc123"
```

**Aggregate: Request rate by status code:**
```logql
rate({namespace="infershield"} | json | action="http.request" [5m]) by (statusCode)
```

**Aggregate: Error rate:**
```logql
sum(rate({namespace="infershield"} | json | level="error" [5m]))
```

**Aggregate: Average response time:**
```logql
avg_over_time({namespace="infershield"} | json | action="http.request" | unwrap duration [5m])
```

## Log Levels

Pino supports these levels:
- `trace` (10) - Very verbose debugging
- `debug` (20) - Debugging information
- `info` (30) - General informational messages (default)
- `warn` (40) - Warnings
- `error` (50) - Errors
- `fatal` (60) - Fatal errors

Set via environment variable:
```bash
LOG_LEVEL=debug node server.js
```

## Retention Policy

**Default: 30 days**

Adjust in `loki-config.yaml`:

```yaml
limits_config:
  retention_period: 720h  # 30 days (720 hours)

table_manager:
  retention_period: 720h
```

For longer retention (90 days):
```yaml
retention_period: 2160h  # 90 days
```

For shorter retention (7 days):
```yaml
retention_period: 168h  # 7 days
```

## Storage

Loki uses:
- **BoltDB** for index storage
- **Filesystem** for chunk storage
- **10Gi PVC** by default

Increase storage in `loki-config.yaml`:

```yaml
volumeClaimTemplates:
  - metadata:
      name: storage
    spec:
      resources:
        requests:
          storage: 50Gi  # Increase to 50Gi
```

## Performance

### Log Volume Estimates

**Typical production load:**
- 1,000 req/s → ~5MB/min logs → ~7GB/day → ~210GB/month

**Storage with compression:**
- Loki compresses logs ~10:1
- 210GB raw → ~21GB compressed

### Resource Usage

**Loki:**
- CPU: 100-500m
- Memory: 256-512Mi
- Disk: 10-50Gi (depends on retention + volume)

**Promtail (per node):**
- CPU: 50-200m
- Memory: 64-128Mi

### Optimization

1. **Reduce log verbosity** - Set `LOG_LEVEL=info` in production
2. **Filter noisy logs** - Exclude health check logs in Promtail
3. **Increase retention interval** - Less frequent queries = less CPU

## Troubleshooting

### No logs appearing in Grafana

1. Check Promtail is running:
```bash
kubectl get pods -n monitoring -l app=promtail
kubectl logs -n monitoring -l app=promtail
```

2. Check Loki is receiving logs:
```bash
kubectl logs -n monitoring -l app=loki
```

3. Verify pod logs are JSON:
```bash
kubectl logs -n infershield <pod-name> | head -1 | jq .
```

### Logs not structured (plain text instead of JSON)

Ensure logger is imported and used:
```javascript
const { logger } = require('./utils/logger');
logger.info({ userId: '123' }, 'Message');  // ✓ Correct
console.log('Message');  // ✗ Wrong (not structured)
```

### High memory usage in Loki

Reduce retention period or increase resources:

```yaml
resources:
  limits:
    memory: 1Gi  # Increase from 512Mi
```

### Missing logs from some pods

Check Promtail ServiceAccount has RBAC permissions:
```bash
kubectl get clusterrolebinding promtail -o yaml
```

## Production Recommendations

1. **Use S3 for long-term storage** instead of filesystem
2. **Enable Loki compactor** for better compression
3. **Set up log sampling** for high-volume apps (10% sample)
4. **Monitor Loki itself** - CPU, memory, disk, ingestion rate
5. **Archive old logs** to S3 Glacier after 90 days

### Loki with S3 Backend

```yaml
storage_config:
  aws:
    s3: s3://region/bucket-name
    s3forcepathstyle: true
  boltdb_shipper:
    active_index_directory: /loki/index
    cache_location: /loki/cache
    shared_store: s3
```

## Integration with Alerting

Create alerts based on logs:

```yaml
# alert-rules.yaml
- alert: HighErrorRate
  expr: |
    sum(rate({namespace="infershield"} | json | level="error" [5m])) > 10
  for: 5m
  annotations:
    summary: "High error rate in logs"
```

## Security

**Log Sanitization:**

Automatically redact sensitive data:

```javascript
const { logger } = require('./utils/logger');

// Before logging
const sanitized = {
  ...data,
  password: '[REDACTED]',
  apiKey: '[REDACTED]',
  creditCard: data.creditCard ? '[REDACTED]' : null
};

logger.info(sanitized, 'User action');
```

**Access Control:**

Restrict Grafana access to logs:
- Create separate Grafana org for operations team
- Use RBAC to limit Loki query access

## Further Reading

- [Loki documentation](https://grafana.com/docs/loki/latest/)
- [LogQL query language](https://grafana.com/docs/loki/latest/logql/)
- [Pino documentation](https://getpino.io/)
- [Promtail configuration](https://grafana.com/docs/loki/latest/clients/promtail/)
