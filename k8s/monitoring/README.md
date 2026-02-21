# InferShield Monitoring & Alerting

Prometheus + Grafana stack for production monitoring of InferShield.

## Overview

### Metrics Collected

**System Metrics:**
- CPU usage per pod
- Memory usage per pod
- Network I/O
- Disk I/O
- Pod restart count

**API Metrics:**
- Request rate (req/s)
- Error rate (5xx responses)
- Request duration (p50, p95, p99)
- Request count by route, method, status

**Business Metrics:**
- Reports generated (total, rate by framework/format)
- Report generation duration
- Report generation failures
- Policy violations (count, rate by type/severity)
- Cache hit/miss rate

**Database Metrics:**
- Active connections
- Query duration (p50, p95, p99)
- Query count by type

## Components

### 1. Prometheus Metrics Middleware

`backend/middleware/metrics.js` exposes metrics at `/metrics` endpoint.

**Usage in Express:**
```javascript
const { metricsMiddleware, metricsHandler } = require('./middleware/metrics');

app.use(metricsMiddleware);
app.get('/metrics', metricsHandler);
```

**Track custom metrics:**
```javascript
const { trackReportGeneration, trackPolicyViolation } = require('./middleware/metrics');

// Track report generation
trackReportGeneration('SOC2', 'pdf', 2.5, false, true);

// Track policy violation
trackPolicyViolation('prompt_injection', 'high', 'blocked');
```

### 2. Prometheus Configuration

`k8s/monitoring/prometheus-config.yaml` defines scrape configs:

- InferShield backend pods (auto-discovery via K8s annotations)
- PostgreSQL (via postgresql_exporter)
- Redis (via redis_exporter)
- Node metrics (via node_exporter)
- Kubernetes API server
- Kubelet

### 3. Alert Rules

`k8s/monitoring/alert-rules.yaml` defines 20+ alert rules:

**System Alerts:**
- HighCPUUsage (>80% for 5m)
- CriticalCPUUsage (>95% for 2m)
- HighMemoryUsage (>800MB for 5m)
- HighPodRestartRate
- PodNotReady

**API Alerts:**
- HighErrorRate (>5% for 5m)
- CriticalErrorRate (>15% for 2m)
- HighLatency (p95 >3s)
- VeryHighLatency (p95 >10s)
- LowRequestRate (possible outage)

**Business Alerts:**
- HighReportFailureRate (>10% for 10m)
- SlowReportGeneration (p95 >30s)
- HighPolicyViolationRate (>10/s)
- LowCacheHitRate (<50% for 15m)

**Infrastructure Alerts:**
- DatabaseDown
- SlowDatabaseQueries (p95 >1s)
- HighDatabaseConnections (>80)
- RedisDown
- HighRedisMemoryUsage (>90%)

### 4. Grafana Dashboard

`dashboards/grafana-infershield-overview.json` - comprehensive dashboard with:

- Request rate, error rate, latency (p50/p95/p99)
- CPU & memory usage
- Pod count
- Report generation metrics
- Policy violation rate
- Cache hit rate
- Database metrics

## Installation

### Prerequisites

- Kubernetes cluster
- Helm 3
- kubectl

### Deploy Prometheus Stack

Using kube-prometheus-stack (recommended):

```bash
# Add helm repo
helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

# Install with InferShield configs
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --create-namespace \
  --set prometheus.prometheusSpec.additionalScrapeConfigs[0].job_name=infershield \
  --set prometheus.prometheusSpec.additionalScrapeConfigs[0].kubernetes_sd_configs[0].role=pod \
  --values prometheus-values.yaml
```

**prometheus-values.yaml:**
```yaml
prometheus:
  prometheusSpec:
    additionalScrapeConfigsSecret:
      enabled: true
      name: additional-scrape-configs
      key: prometheus-additional.yaml
    ruleSelector:
      matchLabels:
        app: infershield

grafana:
  adminPassword: changeme
  dashboardProviders:
    dashboardproviders.yaml:
      apiVersion: 1
      providers:
        - name: 'infershield'
          orgId: 1
          folder: 'InferShield'
          type: file
          disableDeletion: false
          options:
            path: /var/lib/grafana/dashboards/infershield
  dashboards:
    infershield:
      infershield-overview:
        file: dashboards/grafana-infershield-overview.json

alertmanager:
  config:
    global:
      resolve_timeout: 5m
      slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'
    route:
      group_by: ['alertname', 'severity']
      group_wait: 10s
      group_interval: 10s
      repeat_interval: 12h
      receiver: 'slack'
      routes:
        - match:
            severity: critical
          receiver: 'pagerduty'
    receivers:
      - name: 'slack'
        slack_configs:
          - channel: '#infershield-alerts'
            title: '{{ .GroupLabels.alertname }}'
            text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
      - name: 'pagerduty'
        pagerduty_configs:
          - service_key: 'YOUR_PAGERDUTY_SERVICE_KEY'
```

### Deploy Alert Rules

```bash
kubectl create configmap infershield-alert-rules \
  --from-file=alert-rules.yaml=k8s/monitoring/alert-rules.yaml \
  --namespace monitoring

kubectl label configmap infershield-alert-rules \
  app=infershield \
  --namespace monitoring
```

### Import Grafana Dashboard

1. Port-forward Grafana:
```bash
kubectl port-forward -n monitoring svc/prometheus-grafana 3000:80
```

2. Open http://localhost:3000 (admin / changeme)

3. Import dashboard:
   - Go to Dashboards → Import
   - Upload `dashboards/grafana-infershield-overview.json`
   - Select Prometheus datasource

## Alerting Channels

### Slack

1. Create Slack webhook: https://api.slack.com/messaging/webhooks
2. Update `alertmanager.config.global.slack_api_url` in values
3. Alerts will post to `#infershield-alerts`

### PagerDuty

1. Create PagerDuty service: https://support.pagerduty.com/docs/services-and-integrations
2. Get integration key
3. Update `receivers[1].pagerduty_configs[0].service_key` in values
4. Critical alerts will page on-call engineer

### Email

```yaml
receivers:
  - name: 'email'
    email_configs:
      - to: 'oncall@example.com'
        from: 'alerts@example.com'
        smarthost: 'smtp.example.com:587'
        auth_username: 'alerts@example.com'
        auth_password: 'smtp_password'
```

## Custom Metrics

Add new metrics in `backend/middleware/metrics.js`:

```javascript
const customMetric = new promClient.Counter({
  name: 'my_custom_metric_total',
  help: 'Description of my metric',
  labelNames: ['label1', 'label2']
});
register.registerMetric(customMetric);

// Increment elsewhere
customMetric.labels('value1', 'value2').inc();
```

## Queries (PromQL)

**Average request duration:**
```promql
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

**Error rate percentage:**
```promql
100 * (rate(http_requests_total{status_code=~"5.."}[5m]) / rate(http_requests_total[5m]))
```

**Cache hit rate:**
```promql
rate(cache_hits_total[5m]) / (rate(cache_hits_total[5m]) + rate(cache_misses_total[5m]))
```

**Top 5 slowest routes:**
```promql
topk(5, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[10m])))
```

## Troubleshooting

### Prometheus not scraping pods

Check pod annotations:
```bash
kubectl get pods -n infershield -o jsonpath='{.items[*].metadata.annotations}'
```

Should include:
```yaml
prometheus.io/scrape: "true"
prometheus.io/port: "3000"
prometheus.io/path: "/metrics"
```

### No data in Grafana

1. Check Prometheus targets: http://localhost:9090/targets
2. Verify metrics endpoint: `curl http://pod-ip:3000/metrics`
3. Check Grafana datasource connection

### Alerts not firing

1. Check alert rules loaded: http://localhost:9090/rules
2. Verify expression returns data: http://localhost:9090/graph
3. Check Alertmanager status: http://localhost:9093

## Performance Impact

Metrics collection overhead:
- CPU: ~10-20ms per request (<1% for typical loads)
- Memory: ~5-10MB per process
- Storage: ~100KB/day per metric (compressed)

Prometheus retention: 15 days by default (adjust via `prometheus.prometheusSpec.retention`)

## Production Recommendations

1. **Use ServiceMonitor CRD** instead of static scrape configs
2. **Enable Thanos** for long-term metrics storage (years)
3. **Set up Alertmanager HA** (3 replicas with gossip)
4. **Tune scrape intervals** (15s default, increase for high cardinality)
5. **Monitor Prometheus itself** (CPU, memory, disk, ingestion rate)

## Further Reading

- [Prometheus docs](https://prometheus.io/docs/)
- [Grafana dashboards](https://grafana.com/docs/grafana/latest/dashboards/)
- [kube-prometheus-stack](https://github.com/prometheus-community/helm-charts/tree/main/charts/kube-prometheus-stack)
- [Best practices](https://prometheus.io/docs/practices/naming/)
