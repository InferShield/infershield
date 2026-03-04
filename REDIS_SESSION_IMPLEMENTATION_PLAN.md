# Redis Session Store Implementation Plan

**Product:** prod_infershield_001 (InferShield)  
**Track:** Track 4 - Redis Session Store Implementation  
**Authorization:** CEO-GATE1-PROD-001-20260304-APPROVED  
**Timeline:** 2 weeks (Target: April 2, 2026)

## Current Architecture Analysis

**Problem:** Single-instance deployment limitation
- In-memory session storage (Map-based)
- Session state lost on restart
- Cannot horizontally scale (session affinity required)
- No session sharing across instances

**Current Implementation:** `/backend/src/session/sessionManager.js`
- Uses JavaScript `Map` for session storage
- In-process cleanup interval
- TTL-based expiration (default 1 hour)
- EventEmitter for session events

## Proposed Redis Architecture

### 1. Redis Session Store Design

**Storage Schema:**
```
Key Pattern: session:{sessionId}
Value: JSON stringified session data
TTL: Automatic expiration (Redis native)
```

**Session Data Structure:**
```javascript
{
  "sessionId": "uuid-v4",
  "userId": "user_123",
  "data": { /* arbitrary session data */ },
  "createdAt": "ISO timestamp",
  "expiresAt": "ISO timestamp"
}
```

### 2. Implementation Components

#### A. Redis Client Adapter (`/backend/src/session/redisAdapter.js`)
- Connection pooling
- Automatic reconnection
- Health checks
- Error handling
- Fallback strategies

#### B. Redis Session Manager (`/backend/src/session/redisSessionManager.js`)
- Drop-in replacement for current SessionManager
- Backward compatible API
- Redis-backed storage
- TTL management via Redis EXPIRE
- Pub/sub for session events (optional)

#### C. Configuration (`/backend/config/redis.js`)
- Environment-based configuration
- Connection string parsing
- TLS support for production
- Failover configuration

#### D. Migration Layer (`/backend/src/session/sessionFactory.js`)
- Feature flag for Redis vs in-memory
- Gradual rollout support
- Dual-write capability (optional)

### 3. Deployment Architecture

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│ Instance 1  │────▶│   Redis     │◀────│ Instance 2  │
│ (Port 5000) │     │  (Shared)   │     │ (Port 5001) │
└─────────────┘     └─────────────┘     └─────────────┘
```

**Multi-Instance Setup:**
- Load balancer (Nginx/HAProxy) or Railway's built-in LB
- Shared Redis instance (Railway Redis addon or external)
- Session sharing across all instances
- Sticky session NOT required

### 4. Implementation Tasks

#### Phase 1: Core Redis Integration (Days 1-3)
- [ ] Add `ioredis` dependency
- [ ] Create Redis adapter with connection management
- [ ] Implement Redis session manager
- [ ] Add configuration management
- [ ] Write unit tests

#### Phase 2: API Compatibility (Days 4-5)
- [ ] Ensure API compatibility with existing SessionManager
- [ ] Update server.js to use Redis sessions
- [ ] Add feature flag for gradual rollout
- [ ] Update correlation ID middleware if needed

#### Phase 3: Multi-Instance Testing (Days 6-8)
- [ ] Set up local 2-instance test environment
- [ ] Validate session sharing across instances
- [ ] Test session persistence (restart resilience)
- [ ] Performance benchmarks (latency, throughput)

#### Phase 4: Production Readiness (Days 9-11)
- [ ] Add monitoring and health checks
- [ ] Configure Redis for production (Railway)
- [ ] Add graceful degradation (fallback to in-memory)
- [ ] Security hardening (TLS, AUTH)

#### Phase 5: Documentation & Validation (Days 12-14)
- [ ] Deployment guide
- [ ] Configuration reference
- [ ] Migration runbook
- [ ] Performance report
- [ ] Final validation tests

## Success Criteria Mapping

| Criterion | Implementation | Validation Method |
|-----------|---------------|-------------------|
| Multi-instance deployment (2+) | Railway horizontal scaling | Deploy 2 instances, verify both serving |
| Session sharing across instances | Redis shared store | Create session on instance A, read on B |
| Session persistence (restart) | Redis TTL-based storage | Restart instance, verify session survives |
| Performance (<50ms lookup) | ioredis optimized client | Benchmark with artillery/autocannon |
| Zero data loss | Redis persistence (AOF/RDB) | Chaos testing, instance kills |
| Documentation complete | Markdown docs | Review by DevOps + stakeholders |

## Performance Requirements

**Target Metrics:**
- Session lookup latency: <50ms (p95)
- Session write latency: <100ms (p95)
- Throughput: 1000 req/s per instance
- Redis connection pool: 10-50 connections
- Memory usage: <100MB per instance (excluding Redis)

## Security Considerations

1. **Redis Authentication:** Use `REDIS_PASSWORD` env var
2. **TLS/SSL:** Enable for production connections
3. **Network Isolation:** Redis accessible only to backend instances
4. **Session Encryption:** Optional - encrypt session data at rest
5. **Rate Limiting:** Protect Redis from abuse

## Rollback Plan

1. Feature flag: `USE_REDIS_SESSIONS=false` reverts to in-memory
2. Dual-write mode: Write to both Redis and in-memory during transition
3. Monitoring: Alert on Redis connection failures
4. Automatic fallback: If Redis unavailable, use in-memory (degraded mode)

## Dependencies

**NPM Packages:**
- `ioredis@^5.3.2` - Redis client with cluster support
- `uuid@^9.0.0` - Session ID generation (already present)

**Infrastructure:**
- Railway Redis addon OR external Redis (Upstash, Redis Cloud)
- Redis version: 6.0+ (supports RESP3 protocol)

## Testing Strategy

### Unit Tests
- Redis adapter methods
- Session CRUD operations
- TTL expiration logic
- Error handling

### Integration Tests
- Multi-instance session sharing
- Session persistence across restarts
- Load balancer behavior
- Failover scenarios

### Performance Tests
- Latency benchmarks (p50, p95, p99)
- Throughput tests (req/s)
- Memory profiling
- Connection pool efficiency

## Monitoring & Observability

**Metrics to Track:**
- Redis connection status
- Session operation latency
- Session hit/miss rates
- Redis memory usage
- Error rates (connection failures, timeouts)

**Logging:**
- Session creation/deletion events
- Redis connection events
- Performance warnings (>50ms latency)
- Failover events

## Next Steps

1. **Immediate:** Review and approve plan
2. **Day 1:** Begin Phase 1 implementation
3. **Day 7:** Mid-point review with stakeholders
4. **Day 14:** Final validation and sign-off

---

**Status:** Ready for implementation  
**Risk Level:** Medium (proven technology, clear scope)  
**Confidence:** High (90%)  

**Prepared by:** DevOps + Lead Engineer  
**Date:** 2026-03-04  
