# InferShield Disaster Recovery

Automated backup and disaster recovery procedures for production InferShield deployments.

## Overview

### What Gets Backed Up

1. **PostgreSQL Database** - All reports, audit logs, policies, templates
2. **Redis Cache** - Session data, cached reports, rate limit counters
3. **Loki Logs** - Last 7 days of application logs (reference only)

### Backup Schedule

- **Frequency:** Daily at 2:00 AM UTC
- **Retention:** 30 days (configurable)
- **Storage:** AWS S3
- **Compression:** gzip for SQL dumps

### Recovery Objectives

- **RTO (Recovery Time Objective):** <1 hour
- **RPO (Recovery Point Objective):** 24 hours (daily backups)

## Automated Backups

### Setup

#### 1. Create S3 Bucket

```bash
aws s3 mb s3://infershield-backups --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket infershield-backups \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket infershield-backups \
  --server-side-encryption-configuration '{
    "Rules": [{
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "AES256"
      }
    }]
  }'
```

#### 2. Create IAM User

```bash
# Create policy
aws iam create-policy \
  --policy-name InferShieldBackupPolicy \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [{
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:GetObject",
        "s3:DeleteObject",
        "s3:ListBucket"
      ],
      "Resource": [
        "arn:aws:s3:::infershield-backups",
        "arn:aws:s3:::infershield-backups/*"
      ]
    }]
  }'

# Create user
aws iam create-user --user-name infershield-backup

# Attach policy
aws iam attach-user-policy \
  --user-name infershield-backup \
  --policy-arn arn:aws:iam::YOUR_ACCOUNT_ID:policy/InferShieldBackupPolicy

# Generate access keys
aws iam create-access-key --user-name infershield-backup
```

#### 3. Deploy Backup CronJob

```bash
# Create AWS credentials secret
kubectl create secret generic aws-credentials \
  --from-literal=access-key-id=AKIAIOSFODNN7EXAMPLE \
  --from-literal=secret-access-key=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY \
  --from-literal=region=us-east-1 \
  --namespace infershield

# Create PostgreSQL credentials secret (if not exists)
kubectl create secret generic postgres-secret \
  --from-literal=database=infershield \
  --from-literal=username=infershield \
  --from-literal=password=YOUR_PASSWORD \
  --namespace infershield

# Deploy CronJob
kubectl apply -f k8s/backup/cronjob.yaml
```

#### 4. Verify Backup Job

```bash
# Check CronJob
kubectl get cronjob -n infershield

# Trigger manual backup
kubectl create job --from=cronjob/infershield-backup manual-backup-1 -n infershield

# Check job status
kubectl get jobs -n infershield
kubectl logs job/manual-backup-1 -n infershield

# Verify S3 upload
aws s3 ls s3://infershield-backups/prod/
```

## Manual Backups

### Run Backup Script Locally

```bash
# Set environment variables
export POSTGRES_HOST=postgres.infershield.svc.cluster.local
export POSTGRES_PORT=5432
export POSTGRES_DB=infershield
export POSTGRES_USER=infershield
export POSTGRES_PASSWORD=your_password
export REDIS_HOST=redis.infershield.svc.cluster.local
export REDIS_PORT=6379
export S3_BACKUP_BUCKET=infershield-backups
export S3_BACKUP_PREFIX=prod
export AWS_ACCESS_KEY_ID=your_key
export AWS_SECRET_ACCESS_KEY=your_secret

# Run backup
bash scripts/backup.sh

# Test backup (no S3 upload)
bash scripts/backup.sh --test
```

### List Available Backups

```bash
aws s3 ls s3://infershield-backups/prod/

# Example output:
# PRE 2024-02-21-020000/
# PRE 2024-02-22-020000/
# PRE 2024-02-23-020000/
```

### Download Specific Backup

```bash
aws s3 sync s3://infershield-backups/prod/2024-02-21-020000/ ./backup-2024-02-21/
```

## Disaster Recovery Procedures

### Scenario 1: Database Corruption

**Symptoms:**
- Query errors
- Data inconsistency
- Application crashes

**Recovery Steps:**

1. **Identify latest good backup:**
```bash
aws s3 ls s3://infershield-backups/prod/ | sort -r | head -5
```

2. **Restore PostgreSQL:**
```bash
# Set environment variables (same as backup)
export POSTGRES_HOST=...
export POSTGRES_PASSWORD=...
export S3_BACKUP_BUCKET=...

# Run restore
bash scripts/restore.sh 2024-02-23-020000 --postgres-only
```

3. **Verify restore:**
```bash
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d "${POSTGRES_DB}" \
  -c "SELECT COUNT(*) FROM reports;"
```

4. **Restart application pods:**
```bash
kubectl rollout restart deployment/infershield-backend -n infershield
```

**RTO:** 15-30 minutes  
**RPO:** Up to 24 hours data loss

### Scenario 2: Complete Cluster Loss

**Symptoms:**
- Entire Kubernetes cluster unavailable
- Datacenter outage

**Recovery Steps:**

1. **Provision new Kubernetes cluster:**
```bash
# Follow standard cluster setup procedures
```

2. **Deploy InferShield infrastructure:**
```bash
# Deploy PostgreSQL
helm install postgres bitnami/postgresql -n infershield

# Deploy Redis
helm install redis bitnami/redis -n infershield

# Deploy InferShield application
helm install infershield ./k8s/helm/infershield -n infershield
```

3. **Restore all data:**
```bash
# Download latest backup
BACKUP_DATE=$(aws s3 ls s3://infershield-backups/prod/ | sort -r | head -1 | awk '{print $2}' | tr -d '/')

# Restore PostgreSQL + Redis
bash scripts/restore.sh ${BACKUP_DATE}
```

4. **Verify application health:**
```bash
kubectl get pods -n infershield
curl https://infershield.example.com/health
```

**RTO:** 1-2 hours  
**RPO:** Up to 24 hours data loss

### Scenario 3: Accidental Data Deletion

**Symptoms:**
- User reports missing data
- Audit logs show unexpected DELETE operations

**Recovery Steps:**

1. **Identify when deletion occurred:**
```bash
# Check audit logs in Loki
kubectl port-forward -n monitoring svc/loki 3100:3100
# Query: {namespace="infershield"} | json | action="report.deleted"
```

2. **Find backup before deletion:**
```bash
# List backups before incident time
aws s3 ls s3://infershield-backups/prod/ | grep "2024-02-22"
```

3. **Restore to staging environment:**
```bash
# Don't restore directly to production!
# Restore to staging first
export POSTGRES_HOST=postgres-staging.example.com
bash scripts/restore.sh 2024-02-22-100000 --postgres-only
```

4. **Extract deleted data:**
```bash
# Connect to staging database
PGPASSWORD="${STAGING_PASSWORD}" psql \
  -h postgres-staging.example.com \
  -U infershield \
  -d infershield

# Export deleted records
\copy (SELECT * FROM reports WHERE id IN ('report-1', 'report-2')) TO '/tmp/deleted-reports.csv' CSV HEADER;
```

5. **Import to production:**
```bash
# Import deleted records back to production
PGPASSWORD="${PROD_PASSWORD}" psql \
  -h "${PROD_HOST}" \
  -U infershield \
  -d infershield \
  -c "\copy reports FROM '/tmp/deleted-reports.csv' CSV HEADER;"
```

**RTO:** 30-60 minutes  
**RPO:** Up to 24 hours (depends on backup timing)

### Scenario 4: Redis Data Loss

**Symptoms:**
- All users logged out
- Cached reports missing
- Rate limiting reset

**Recovery Steps:**

1. **Restore Redis:**
```bash
bash scripts/restore.sh 2024-02-23-020000 --redis-only
```

2. **Verify Redis data:**
```bash
redis-cli -h "${REDIS_HOST}" -p "${REDIS_PORT}" DBSIZE
```

**RTO:** 5-10 minutes  
**RPO:** Up to 24 hours

**Note:** Redis data is mostly ephemeral (sessions, cache). Full restore may not be necessary.

## Testing DR Procedures

### Quarterly DR Test

Run every 3 months to validate backup/restore procedures.

**Test Checklist:**

1. **Verify automated backups are running:**
```bash
kubectl get cronjob -n infershield
kubectl get jobs -n infershield | grep backup
aws s3 ls s3://infershield-backups/prod/ | tail -7
```

2. **Test backup script:**
```bash
bash scripts/test-dr.sh
```

3. **Perform full restore to staging:**
```bash
# Restore to staging environment
export POSTGRES_HOST=staging.postgres.example.com
export REDIS_HOST=staging.redis.example.com
bash scripts/restore.sh $(date +%Y-%m-%d)-020000
```

4. **Verify restored data:**
```bash
# Check row counts match production
PGPASSWORD="${STAGING_PASSWORD}" psql \
  -h staging.postgres.example.com \
  -U infershield \
  -d infershield \
  -c "SELECT 
        (SELECT COUNT(*) FROM reports) AS reports_count,
        (SELECT COUNT(*) FROM audit_logs) AS audit_logs_count,
        (SELECT COUNT(*) FROM policies) AS policies_count;"
```

5. **Document test results:**
```markdown
## DR Test - 2024-02-23

- Backup retrieval: ✓ Success (2.3 minutes)
- PostgreSQL restore: ✓ Success (4.7 minutes)
- Redis restore: ✓ Success (1.2 minutes)
- Application startup: ✓ Success (0.8 minutes)
- Total RTO: 9 minutes (target: <1 hour)

Issues: None
```

## Monitoring & Alerts

### Backup Success Monitoring

Create Prometheus alert for failed backups:

```yaml
- alert: BackupJobFailed
  expr: kube_job_status_failed{job_name=~"infershield-backup.*"} > 0
  for: 5m
  labels:
    severity: critical
  annotations:
    summary: "Backup job failed"
    description: "InferShield backup job {{ $labels.job_name }} has failed"
```

### Backup Age Monitoring

Alert if backup is too old:

```yaml
- alert: BackupTooOld
  expr: (time() - last_successful_backup_timestamp) > 86400 * 2
  for: 1h
  labels:
    severity: warning
  annotations:
    summary: "Backup is too old"
    description: "Last successful backup was {{ $value | humanizeDuration }} ago"
```

## Backup Costs

### Storage Costs (S3)

**Example calculation:**
- Daily backup size: 500MB (compressed)
- 30-day retention: 15GB total
- S3 Standard storage: $0.023/GB/month
- **Monthly cost:** $0.35

**With versioning + encryption:**
- Estimated monthly cost: $0.50-1.00

### Transfer Costs

- Upload (free): $0
- Download: $0.09/GB
- **DR event (15GB download):** $1.35

## Best Practices

1. **Test restores regularly** (quarterly minimum)
2. **Document all DR tests** (include timestamps, duration, issues)
3. **Monitor backup job success** (alert on failures)
4. **Encrypt backups at rest** (use S3 encryption)
5. **Restrict S3 access** (IAM policies, MFA delete)
6. **Verify backup integrity** (test downloads work)
7. **Keep credentials secure** (use Kubernetes secrets, not plain text)
8. **Maintain DR runbook** (update after each test)

## Troubleshooting

### Backup Job Fails

**Check logs:**
```bash
kubectl logs job/infershield-backup-123456 -n infershield
```

**Common issues:**
- S3 credentials invalid → Update secret
- Database connection failed → Check connectivity
- Out of disk space → Increase PVC size

### Restore Hangs

**Check database connections:**
```bash
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h "${POSTGRES_HOST}" \
  -U "${POSTGRES_USER}" \
  -d postgres \
  -c "SELECT * FROM pg_stat_activity WHERE datname='${POSTGRES_DB}';"
```

**Kill blocking queries:**
```sql
SELECT pg_terminate_backend(pid) 
FROM pg_stat_activity 
WHERE datname = 'infershield' AND pid <> pg_backend_pid();
```

### S3 Access Denied

**Verify credentials:**
```bash
aws sts get-caller-identity
```

**Test S3 access:**
```bash
aws s3 ls s3://infershield-backups/prod/
```

**Check IAM policy:**
```bash
aws iam list-attached-user-policies --user-name infershield-backup
```

## Support Contacts

- **Primary:** ops@infershield.io
- **Escalation:** security@infershield.io
- **On-call:** PagerDuty (via Slack /pd trigger)

## Appendix: Backup File Structure

```
s3://infershield-backups/prod/2024-02-23-020000/
├── manifest.json                       # Backup metadata
├── postgres-2024-02-23-020000.sql.gz  # PostgreSQL dump
├── redis-2024-02-23-020000.rdb        # Redis snapshot
└── loki-2024-02-23-020000.json.gz     # Loki logs (last 7 days)
```

**manifest.json:**
```json
{
  "timestamp": "2024-02-23T02:00:00Z",
  "version": "0.4.0",
  "components": {
    "postgresql": {
      "file": "postgres-2024-02-23-020000.sql.gz",
      "size": 524288000
    },
    "redis": {
      "file": "redis-2024-02-23-020000.rdb",
      "size": 10485760
    },
    "loki": {
      "file": "loki-2024-02-23-020000.json.gz",
      "size": 52428800
    }
  }
}
```
