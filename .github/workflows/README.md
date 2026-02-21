# InferShield CI/CD Pipeline

Automated testing, building, and deployment using GitHub Actions.

## Overview

### Workflows

1. **Test** - Runs on every PR and push to main
   - Unit tests
   - Integration tests
   - Code linting
   - Security scans

2. **Build & Publish** - Runs on push to main and version tags
   - Build Docker images
   - Publish to GitHub Container Registry (GHCR)
   - Publish Helm charts

3. **Deploy** - Manual trigger for staging/production
   - Deploy to Kubernetes
   - Run database migrations
   - Smoke tests
   - Slack notifications

## Test Workflow

**Trigger:** Every PR and push to `main`

**Steps:**
1. Checkout code
2. Setup Node.js 20 with npm cache
3. Start PostgreSQL + Redis (service containers)
4. Install dependencies
5. Run database migrations
6. Run tests
7. Generate coverage report
8. Upload to Codecov
9. Lint with ESLint
10. Security scan with Snyk

**Services:**
- PostgreSQL 15
- Redis 7

**Coverage:**
- Uploaded to Codecov
- Fails if coverage drops below threshold

**Example:**
```bash
# Test workflow runs automatically on PR
git checkout -b feature/new-feature
git push origin feature/new-feature
# Opens PR → Test workflow runs
```

## Build & Publish Workflow

**Trigger:**
- Push to `main` branch
- Push tag matching `v*` (e.g. `v0.4.0`)

**Steps:**
1. Checkout code
2. Setup Docker Buildx
3. Login to GHCR
4. Extract Docker metadata (tags, labels)
5. Build multi-arch image (amd64, arm64)
6. Push to GHCR
7. Package Helm chart (on tags only)
8. Upload Helm chart to release

**Docker Tags:**
- `main` - Latest from main branch
- `v0.4.0` - Specific version
- `v0.4` - Major.minor
- `v0` - Major only
- `main-abc1234` - Branch + SHA

**Example:**
```bash
# Push to main → builds and publishes docker image
git push origin main

# Create release → publishes docker image + helm chart
git tag v0.4.0
git push origin v0.4.0
```

**Docker Image Location:**
```
ghcr.io/infershield/infershield:v0.4.0
```

## Deploy Workflow

**Trigger:** Manual (workflow_dispatch)

**Inputs:**
- `environment` - staging or production
- `version` - Version tag to deploy (e.g. v0.4.0)

**Steps:**
1. Checkout code at specified version
2. Install kubectl + Helm
3. Configure kubectl (from secret)
4. Validate cluster connection
5. Create namespace if not exists
6. Deploy PostgreSQL (if not exists)
7. Deploy Redis (if not exists)
8. Run database migrations
9. Deploy InferShield via Helm
10. Verify deployment (rollout status)
11. Run smoke tests
12. Notify Slack

**Example:**
```bash
# Via GitHub UI:
# 1. Go to Actions → Deploy
# 2. Click "Run workflow"
# 3. Select environment: staging
# 4. Enter version: v0.4.0
# 5. Click "Run workflow"

# Via GitHub CLI:
gh workflow run deploy.yml \
  -f environment=staging \
  -f version=v0.4.0
```

## Required Secrets

### Repository Secrets

Configure in Settings → Secrets and variables → Actions:

**For Test Workflow:**
- `SNYK_TOKEN` - Snyk API token (security scanning)

**For Build Workflow:**
- `GITHUB_TOKEN` - Automatically provided

**For Deploy Workflow:**
- `KUBECONFIG` - Base64-encoded kubeconfig file
- `POSTGRES_PASSWORD` - PostgreSQL password
- `DATABASE_URL` - Full database connection string
- `INGRESS_HOST` - Domain name (e.g. infershield.example.com)
- `SLACK_WEBHOOK_URL` - Slack webhook for notifications

### Environment Secrets

Configure in Settings → Environments → [staging|production]:

**Staging:**
- `KUBECONFIG` - Staging cluster kubeconfig
- `DATABASE_URL` - postgresql://infershield:password@postgres:5432/infershield
- `INGRESS_HOST` - staging.infershield.example.com

**Production:**
- `KUBECONFIG` - Production cluster kubeconfig
- `DATABASE_URL` - postgresql://infershield:password@postgres:5432/infershield
- `INGRESS_HOST` - infershield.example.com

## Setup Guide

### 1. Enable GitHub Container Registry

Already enabled for this repo.

### 2. Configure Secrets

```bash
# Encode kubeconfig
cat ~/.kube/config | base64 | pbcopy

# Add to GitHub:
# Settings → Secrets → New repository secret
# Name: KUBECONFIG
# Value: <paste base64 kubeconfig>
```

### 3. Configure Environments

```bash
# GitHub UI:
# Settings → Environments → New environment
# Name: staging
# Add environment secrets (KUBECONFIG, DATABASE_URL, INGRESS_HOST)

# Repeat for production
```

### 4. Configure Snyk (Optional)

```bash
# Sign up: https://snyk.io/
# Get API token: Account Settings → API Token
# Add to GitHub: Settings → Secrets → SNYK_TOKEN
```

### 5. Configure Codecov (Optional)

```bash
# Sign up: https://codecov.io/
# Link repository
# Token automatically detected via GitHub App
```

### 6. Configure Slack Notifications

```bash
# Create Slack app: https://api.slack.com/apps
# Enable incoming webhooks
# Add webhook to channel
# Copy webhook URL
# Add to GitHub: Settings → Secrets → SLACK_WEBHOOK_URL
```

## Deployment Process

### Staging Deployment

1. **Create feature branch:**
```bash
git checkout -b feature/new-feature
```

2. **Make changes, commit, push:**
```bash
git add .
git commit -m "feat: Add new feature"
git push origin feature/new-feature
```

3. **Open PR → Test workflow runs automatically**

4. **Merge PR → Build workflow runs automatically**

5. **Deploy to staging:**
```bash
# Via GitHub UI: Actions → Deploy → Run workflow
# Environment: staging
# Version: main (or specific tag)
```

6. **Verify staging:**
```bash
curl https://staging.infershield.example.com/health
```

### Production Deployment

1. **Create release tag:**
```bash
git checkout main
git pull
git tag v0.4.0
git push origin v0.4.0
```

2. **Build workflow runs automatically** (publishes Docker image + Helm chart)

3. **Deploy to production:**
```bash
# Via GitHub UI: Actions → Deploy → Run workflow
# Environment: production
# Version: v0.4.0
```

4. **Verify production:**
```bash
curl https://infershield.example.com/health
```

## Rollback Procedure

### Option 1: Deploy Previous Version

```bash
# Via GitHub UI:
# Actions → Deploy → Run workflow
# Environment: production
# Version: v0.3.2 (previous working version)
```

### Option 2: Helm Rollback

```bash
# SSH into cluster
kubectl config use-context production

# Check rollout history
helm history infershield -n infershield

# Rollback to previous revision
helm rollback infershield -n infershield

# Verify
kubectl rollout status deployment/infershield-backend -n infershield
```

### Option 3: Revert Commit

```bash
# Revert bad commit
git revert <commit-hash>
git push origin main

# Create hotfix tag
git tag v0.4.1
git push origin v0.4.1

# Deploy hotfix
# Actions → Deploy → v0.4.1
```

## Monitoring & Notifications

### Build Status Badge

Add to README.md:

```markdown
![Test](https://github.com/InferShield/infershield/actions/workflows/test.yml/badge.svg)
![Build](https://github.com/InferShield/infershield/actions/workflows/build.yml/badge.svg)
```

### Slack Notifications

Deployment status posted to Slack:

```
Deployment success: production - v0.4.0
Environment: production
Version: v0.4.0
Triggered by: alexhosein
```

### Codecov Reports

Coverage reports posted as PR comments:

```
Coverage: 85.2% (+2.1%)
Files changed: 5
Lines added: 120
Lines removed: 30
```

## Troubleshooting

### Test Workflow Fails

**Check logs:**
```bash
# Via GitHub UI: Actions → Test → Failed run → View logs
```

**Common issues:**
- Database connection failed → Check PostgreSQL service
- Tests timeout → Increase timeout or fix slow tests
- Linting errors → Run `npx eslint . --fix` locally

### Build Workflow Fails

**Check logs:**
```bash
# Via GitHub UI: Actions → Build → Failed run → View logs
```

**Common issues:**
- Docker build fails → Check Dockerfile
- GHCR login fails → Check GITHUB_TOKEN permissions
- Multi-arch build fails → Disable arm64 temporarily

### Deploy Workflow Fails

**Check logs:**
```bash
# Via GitHub UI: Actions → Deploy → Failed run → View logs
```

**Common issues:**
- kubectl connection fails → Check KUBECONFIG secret
- Migrations fail → Check DATABASE_URL
- Deployment timeout → Check pod logs: `kubectl logs -n infershield <pod>`
- Smoke tests fail → Check ingress configuration

## Performance Optimization

### Cache npm Dependencies

Already configured in workflows:

```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
    cache-dependency-path: backend/package-lock.json
```

### Cache Docker Layers

Already configured in build workflow:

```yaml
cache-from: type=gha
cache-to: type=gha,mode=max
```

### Parallel Jobs

Test workflow runs 3 jobs in parallel:
- test
- lint
- security

## Security

### Secrets Management

- Never commit secrets
- Use GitHub Secrets for sensitive data
- Rotate secrets regularly (quarterly)
- Use environment-specific secrets

### Image Scanning

Snyk scans Docker images for vulnerabilities.

### Dependency Auditing

`npm audit` runs on every test workflow.

### KUBECONFIG Security

- Base64-encode kubeconfig
- Store in GitHub Secrets (encrypted)
- Use RBAC to limit permissions

## Cost Optimization

### GitHub Actions Minutes

**Free tier:**
- Public repos: Unlimited
- Private repos: 2,000 minutes/month

**This pipeline uses ~10 min per deployment:**
- Test: 3 min
- Build: 5 min
- Deploy: 2 min

**Estimated monthly usage:**
- 20 deployments/month = 200 minutes
- Well under free tier limit

### Docker Registry Storage

GitHub Container Registry (GHCR):
- Public images: Free
- Private images: 500MB free, then $0.25/GB/month

## Best Practices

1. ✓ Run tests on every PR
2. ✓ Build Docker images on every push to main
3. ✓ Use semantic versioning (v0.4.0)
4. ✓ Deploy to staging before production
5. ✓ Run smoke tests after deployment
6. ✓ Notify team on deployment status
7. ✓ Use environment-specific secrets
8. ✓ Keep secrets out of code
9. ✓ Monitor build times
10. ✓ Cache dependencies

## Further Reading

- [GitHub Actions docs](https://docs.github.com/en/actions)
- [Docker Build Push Action](https://github.com/docker/build-push-action)
- [Helm deployment](https://helm.sh/docs/topics/charts/)
- [Kubernetes deployment strategies](https://kubernetes.io/docs/concepts/workloads/controllers/deployment/)
