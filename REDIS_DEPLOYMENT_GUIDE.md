# Redis Session Store - Deployment Guide

## Overview

InferShield now supports Redis-backed session storage for horizontal scaling and session persistence. This guide covers deployment, configuration, and validation.

## Prerequisites

- Redis 6.0+ (Railway Redis addon, Upstash, Redis Cloud, or self-hosted)
- Node.js 16+
- InferShield backend v0.9.0+

## Configuration

### Environment Variables

Add the following environment variables to your deployment:

```bash
# Redis Connection (Option 1: URL format - recommended)
REDIS_URL=redis://user:password@host:port/db
# Or for TLS:
REDIS_URL=rediss://user:password@host:port/db

# Redis Connection (Option 2: Individual parameters)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=your-password
REDIS_DB=0
REDIS_TLS=false

# Session Configuration
SESSION_TTL=3600                    # Session TTL in seconds (default: 1 hour)
SESSION_CLEANUP_INTERVAL=300000     # Cleanup check interval in ms (default: 5 min)

# Feature Flags
USE_REDIS_SESSIONS=true             # Enable Redis sessions (default: true)
REDIS_FALLBACK_MEMORY=false         # Fallback to in-memory on Redis failure (default: false)
```

### Railway Deployment

1. **Add Redis Service:**
   - In Railway dashboard: "New" → "Database" → "Add Redis"
   - Railway automatically sets `REDIS_URL` environment variable

2. **Update Backend Service:**
   ```bash
   # No additional config needed - REDIS_URL is auto-injected
   # Optionally customize session TTL:
   railway variables set SESSION_TTL=7200
   ```

3. **Deploy:**
   ```bash
   git push railway main
   ```

### Docker Compose (Local Testing)

```yaml
version: '3.8'
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    
  backend-1:
    build: ./backend
    ports:
      - "5000:5000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - PORT=5000
    depends_on:
      - redis
      
  backend-2:
    build: ./backend
    ports:
      - "5001:5000"
    environment:
      - REDIS_URL=redis://redis:6379/0
      - PORT=5000
    depends_on:
      - redis

volumes:
  redis-data:
```

Start multi-instance setup:
```bash
docker-compose up -d
```

## Validation

### 1. Health Check

Verify Redis connection:

```bash
curl http://localhost:5000/health
# Should return: {"status":"ok"}
```

Check logs for Redis connection:
```
✅ Redis connected
✅ Redis ready
✅ RedisSessionManager ready
```

### 2. Multi-Instance Session Sharing Test

Run the automated test suite:

```bash
cd backend
node test-multi-instance.js
```

Expected output:
```
✅ Instance A is healthy
✅ Instance B is healthy
✅ Session created on Instance A
✅ Session accessible from Instance B (session sharing works!)
✅ Session update propagated to Instance A
✅ Concurrent writes handled successfully
✅ Performance benchmark passed (<50ms p95)

🎉 All automated tests passed!
```

### 3. Manual Session Persistence Test

1. Create a session:
   ```bash
   curl -X POST http://localhost:5000/api/analyze \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: test-session-123" \
     -d '{"prompt":"Test persistence","agent_id":"test"}'
   ```

2. Restart instance:
   ```bash
   # Docker
   docker-compose restart backend-1
   
   # Railway (graceful restart happens on deploy)
   railway up
   ```

3. Verify session survives:
   ```bash
   curl -X POST http://localhost:5000/api/analyze \
     -H "Content-Type: application/json" \
     -H "X-Session-ID: test-session-123" \
     -d '{"prompt":"Verify persistence","agent_id":"test"}'
   ```

### 4. Load Test

Install load testing tool:
```bash
npm install -g autocannon
```

Run load test:
```bash
autocannon -c 10 -d 30 -m POST \
  -H "Content-Type: application/json" \
  -H "X-Session-ID: load-test-session" \
  -b '{"prompt":"Load test","agent_id":"test"}' \
  http://localhost:5000/api/analyze
```

Expected performance:
- **Latency (p95):** <50ms
- **Throughput:** 500+ req/s per instance
- **Error Rate:** 0%

## Monitoring

### Key Metrics

1. **Redis Connection Status**
   - Check logs for: `✅ Redis connected` / `❌ Redis error`
   - Monitor connection pool utilization

2. **Session Operations**
   - Session creation rate
   - Session lookup latency (p50, p95, p99)
   - Cache hit/miss ratio

3. **Resource Usage**
   - Redis memory usage (track session count × avg session size)
   - Backend memory (should remain stable, <100MB)
   - CPU usage during high traffic

### Logging

Session operations are logged with structured data:

```json
{
  "event": "sessionCreated",
  "sessionId": "abc123",
  "timestamp": "2026-03-04T15:00:00Z"
}
```

Monitor for errors:
```bash
# Railway
railway logs | grep "Redis error"

# Docker
docker-compose logs backend-1 | grep "Redis error"
```

## Troubleshooting

### Issue: Redis connection failed

**Symptoms:**
```
❌ Redis connection failed
⚠️  Falling back to in-memory SessionManager
```

**Solutions:**
1. Verify `REDIS_URL` is set correctly
2. Check Redis service is running: `redis-cli ping`
3. Verify network connectivity to Redis host
4. Check Redis AUTH password if required
5. For Railway: Ensure Redis addon is attached to backend service

### Issue: Sessions not shared across instances

**Symptoms:**
- Session created on Instance A not visible on Instance B

**Solutions:**
1. Verify both instances use same `REDIS_URL`
2. Check Redis DB number (ensure both use same DB)
3. Verify session key prefix is consistent
4. Check Redis logs for replication issues (if using Redis Cluster)

### Issue: High latency (>50ms)

**Symptoms:**
- Performance benchmark shows p95 >50ms

**Solutions:**
1. Check Redis network latency: `redis-cli --latency`
2. Optimize Redis persistence (use RDB instead of AOF for performance)
3. Increase Redis connection pool size
4. Consider Redis clustering for high traffic
5. Enable Redis pipelining for batch operations

### Issue: Session data loss

**Symptoms:**
- Sessions disappear unexpectedly
- Session data corrupted

**Solutions:**
1. Verify Redis persistence is enabled (AOF or RDB)
2. Check Redis memory limits (eviction policy)
3. Ensure TTL is set correctly (`SESSION_TTL`)
4. Monitor Redis memory usage (avoid OOM)
5. Check for Redis crashes in logs

## Rollback Procedure

If Redis causes issues, rollback to in-memory sessions:

1. **Disable Redis:**
   ```bash
   railway variables set USE_REDIS_SESSIONS=false
   # Or in .env:
   USE_REDIS_SESSIONS=false
   ```

2. **Redeploy:**
   ```bash
   git push railway main
   ```

3. **Verify:**
   ```bash
   # Check logs for:
   ✅ Using in-memory SessionManager
   ```

**Note:** Rollback to in-memory sessions means:
- ❌ No session sharing across instances
- ❌ Sessions lost on restart
- ✅ But system remains operational

## Production Checklist

Before deploying Redis sessions to production:

- [ ] Redis persistence enabled (AOF or RDB)
- [ ] Redis AUTH password configured
- [ ] TLS/SSL enabled for Redis connection
- [ ] Session TTL configured appropriately
- [ ] Monitoring and alerts set up
- [ ] Backup strategy for Redis data
- [ ] Load testing completed successfully
- [ ] Multi-instance validation passed
- [ ] Rollback procedure documented
- [ ] Team trained on troubleshooting

## Performance Tuning

### Redis Configuration

Optimize Redis for session storage:

```conf
# /etc/redis/redis.conf

# Persistence (balance performance vs durability)
appendonly yes
appendfsync everysec  # Good balance

# Memory
maxmemory 2gb
maxmemory-policy allkeys-lru  # Evict least recently used

# Performance
tcp-backlog 511
timeout 0
tcp-keepalive 300
```

### Backend Configuration

Tune session manager for your workload:

```bash
# High-traffic scenario
SESSION_TTL=1800           # 30 minutes (shorter for more turnover)
SESSION_CLEANUP_INTERVAL=60000  # 1 minute (more frequent monitoring)

# Long-lived sessions
SESSION_TTL=7200           # 2 hours
SESSION_CLEANUP_INTERVAL=600000  # 10 minutes
```

## Security Considerations

1. **Redis Authentication:**
   - Always use `requirepass` in production
   - Rotate Redis passwords regularly

2. **Network Isolation:**
   - Redis should only be accessible to backend instances
   - Use VPC/private networking (Railway provides this)
   - Block external Redis access with firewall

3. **TLS/SSL:**
   - Use `rediss://` protocol for encrypted connections
   - Verify TLS certificates in production

4. **Session Data:**
   - Do not store sensitive data in sessions (PII, passwords)
   - Encrypt session data if necessary (application-level encryption)

## Cost Optimization

### Railway Redis Pricing

- **Starter:** Included (512 MB RAM, good for dev/testing)
- **Pro:** $10/month (1 GB RAM, suitable for production)
- **Scale:** Usage-based (>1 GB)

### External Redis Providers

- **Upstash:** Serverless Redis, pay-per-request (~$0.20/100k requests)
- **Redis Cloud:** Starts at $5/month (30 MB)
- **AWS ElastiCache:** Starts at $15/month (0.5 GB)

### Cost Tips

1. Set appropriate TTL (shorter = less storage)
2. Monitor session count (alert on spikes)
3. Use Redis memory limits to prevent overages
4. Consider session cleanup policies

## Support

**Issues?**
- GitHub Issues: https://github.com/infershield/infershield/issues
- Documentation: https://docs.infershield.com
- Email: support@infershield.com

**Monitoring:**
- Redis health: Check `/health` endpoint
- Session metrics: Check application logs
- Performance: Run `test-multi-instance.js` periodically

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-04  
**Applies to:** InferShield v0.9.0+
