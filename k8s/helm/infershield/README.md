# InferShield Helm Chart

Official Kubernetes Helm chart for deploying InferShield AI security platform.

## Prerequisites

- Kubernetes 1.21+
- Helm 3.8+
- PV provisioner support in the underlying infrastructure (for PostgreSQL and Redis persistence)
- cert-manager (for TLS certificates)
- Ingress controller (nginx recommended)

## Installation

### Add Helm repository (future)

```bash
helm repo add infershield https://infershield.github.io/helm-charts
helm repo update
```

### Install from source

```bash
git clone https://github.com/InferShield/infershield.git
cd infershield/k8s/helm/infershield
helm install infershield . --namespace infershield --create-namespace
```

### Install with custom values

```bash
helm install infershield . \
  --namespace infershield \
  --create-namespace \
  --values custom-values.yaml
```

## Configuration

### Key Parameters

| Parameter | Description | Default |
|-----------|-------------|---------|
| `replicaCount` | Number of replicas | `2` |
| `image.repository` | Image repository | `ghcr.io/infershield/infershield` |
| `image.tag` | Image tag | `Chart.appVersion` |
| `ingress.enabled` | Enable ingress | `true` |
| `ingress.hosts[0].host` | Ingress hostname | `api.infershield.io` |
| `autoscaling.enabled` | Enable HPA | `true` |
| `autoscaling.minReplicas` | Min replicas | `2` |
| `autoscaling.maxReplicas` | Max replicas | `10` |
| `autoscaling.targetCPUUtilizationPercentage` | Target CPU % | `70` |
| `resources.limits.cpu` | CPU limit | `1000m` |
| `resources.limits.memory` | Memory limit | `1Gi` |

### Security Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.security.encryptionEnabled` | Enable AES-256 encryption | `true` |
| `config.security.rateLimitEnabled` | Enable rate limiting | `true` |
| `config.security.auditLoggingEnabled` | Enable audit logging | `true` |
| `secrets.databasePassword` | Database password | `""` (must set) |
| `secrets.redisPassword` | Redis password | `""` (must set) |
| `secrets.jwtSecret` | JWT secret key | `""` (must set) |
| `secrets.encryptionKey` | Encryption key (32 bytes) | `""` (must set) |

### Performance Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `config.performance.cacheEnabled` | Enable Redis caching | `true` |
| `config.performance.workerThreads` | Worker thread count | `4` |
| `config.performance.preAggregationEnabled` | Enable nightly pre-aggregation | `true` |

### Database Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `postgresql.enabled` | Deploy PostgreSQL | `true` |
| `postgresql.auth.username` | Database username | `infershield` |
| `postgresql.auth.database` | Database name | `infershield` |
| `postgresql.primary.persistence.size` | PVC size | `10Gi` |

### Redis Configuration

| Parameter | Description | Default |
|-----------|-------------|---------|
| `redis.enabled` | Deploy Redis | `true` |
| `redis.auth.enabled` | Enable Redis auth | `true` |
| `redis.master.persistence.size` | PVC size | `8Gi` |

## Production Deployment

### 1. Create secrets

Use Sealed Secrets or External Secrets Operator:

```bash
# Example with sealed-secrets
kubectl create secret generic infershield-secrets \
  --from-literal=database-password=$(openssl rand -base64 32) \
  --from-literal=redis-password=$(openssl rand -base64 32) \
  --from-literal=jwt-secret=$(openssl rand -base64 32) \
  --from-literal=encryption-key=$(openssl rand -base64 32) \
  --dry-run=client -o yaml | \
  kubeseal --format yaml > sealed-secret.yaml

kubectl apply -f sealed-secret.yaml
```

### 2. Configure TLS

Ensure cert-manager is installed:

```bash
kubectl apply -f https://github.com/cert-manager/cert-manager/releases/download/v1.13.0/cert-manager.yaml
```

Create ClusterIssuer:

```yaml
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: admin@example.com
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
    - http01:
        ingress:
          class: nginx
```

### 3. Deploy with production values

```yaml
# production-values.yaml
replicaCount: 3

resources:
  limits:
    cpu: 2000m
    memory: 2Gi
  requests:
    cpu: 1000m
    memory: 1Gi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 20
  targetCPUUtilizationPercentage: 60

ingress:
  hosts:
    - host: api.infershield.io
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: infershield-tls
      hosts:
        - api.infershield.io

postgresql:
  primary:
    persistence:
      size: 50Gi
    resources:
      limits:
        cpu: 1000m
        memory: 2Gi
      requests:
        cpu: 500m
        memory: 1Gi

redis:
  master:
    persistence:
      size: 20Gi
    resources:
      limits:
        cpu: 500m
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 512Mi
```

```bash
helm install infershield . \
  --namespace infershield \
  --create-namespace \
  --values production-values.yaml
```

## Upgrading

```bash
helm upgrade infershield . \
  --namespace infershield \
  --values production-values.yaml
```

## Uninstalling

```bash
helm uninstall infershield --namespace infershield
```

Note: PVCs are not deleted automatically. Delete manually if needed:

```bash
kubectl delete pvc -n infershield --all
```

## Monitoring

Enable ServiceMonitor for Prometheus:

```yaml
metrics:
  enabled: true
  serviceMonitor:
    enabled: true
    interval: 30s
```

## Troubleshooting

### Check pod status

```bash
kubectl get pods -n infershield
kubectl logs -n infershield <pod-name>
```

### Check service endpoints

```bash
kubectl get svc -n infershield
kubectl get ingress -n infershield
```

### Test database connection

```bash
kubectl exec -it -n infershield <pod-name> -- psql -h postgres-postgresql -U infershield
```

### Check HPA status

```bash
kubectl get hpa -n infershield
kubectl describe hpa infershield -n infershield
```

## Support

- Documentation: https://github.com/InferShield/infershield
- Issues: https://github.com/InferShield/infershield/issues
- Security: security@infershield.io
