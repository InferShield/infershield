# Component 8: API Key Management - Test Plan

**Product:** prod_infershield_001 (InferShield)  
**Component:** API Key Management & Authentication  
**Test Lead:** QA Lead (Subagent)  
**Date:** 2026-03-04  
**Status:** Ready for Execution

---

## Executive Summary

This test plan covers comprehensive security testing of Component 8 (API Key Management), focusing on authentication, authorization, key lifecycle, cryptographic security, and attack surface hardening.

**Test Coverage:**
- ✅ Key generation and cryptographic security
- ✅ Key authentication and validation
- ✅ Key lifecycle management (create, list, revoke, expiry)
- ✅ Authorization and tenant isolation
- ✅ Rate limiting and abuse prevention
- ✅ Security edge cases and attack vectors
- ✅ Performance and scalability
- ✅ Audit logging and compliance

**Total Test Cases:** 52  
**Test Execution Time:** ~20 minutes  
**Dependencies:** Backend services, PostgreSQL/SQLite database, authentication middleware

---

## Component Architecture

### Core Components Under Test

1. **ApiKeyService** (`backend/services/api-key-service.js`)
   - Key generation with secure prefix format (`isk_live_*`, `isk_test_*`)
   - Bcrypt hashing (10 rounds) for key storage
   - Key validation and user lookup
   - Key lifecycle management (create, revoke, expire)

2. **Authentication Middleware** (`backend/middleware/auth.js`)
   - `authenticateAPIKey()` - API key authentication
   - `authenticateJWT()` - JWT authentication
   - `optionalAuth()` - Flexible authentication

3. **API Routes** (`backend/routes/keys.js`)
   - POST /api/keys - Create new key
   - GET /api/keys - List user's keys
   - GET /api/keys/:id - Get key details
   - DELETE /api/keys/:id - Revoke key

4. **Database Schema** (`backend/database/migrations/20260222002800_create_api_keys_table.js`)
   - Key storage with bcrypt hashing
   - Usage tracking (total_requests, last_used_at)
   - Expiration and revocation support
   - Multi-tenant isolation via user_id

---

## Security Requirements (from SECURITY.md)

1. **Key Storage:** Bcrypt hashing only, never plaintext
2. **Key Display:** Show plaintext key once on creation only
3. **Key Validation:** Pre-authentication lookup by prefix, bcrypt comparison
4. **Tenant Isolation:** All key operations scoped by user_id
5. **Rate Limiting:** Per-key request tracking
6. **Audit Logging:** All key operations logged
7. **Expiration:** Time-based expiration support
8. **Revocation:** Immediate revocation capability

---

## Test Categories

### Category 1: Key Generation and Cryptographic Security

**Purpose:** Verify secure key generation and storage

#### TC-KEYGEN-001: Key Format Validation (Production)
**Steps:**
1. Create API key with environment="production"

**Expected Result:**
- Key format: `isk_live_[24 random base64url chars]`
- Example: `isk_live_AbC123-_xYz456`
- Total length: ~40 characters
- Uses URL-safe base64 (no `/`, `+`, or `=`)

**Priority:** P0

---

#### TC-KEYGEN-002: Key Format Validation (Test)
**Steps:**
1. Create API key with environment="test"

**Expected Result:**
- Key format: `isk_test_[24 random base64url chars]`
- Example: `isk_test_XyZ789-_AbC012`

**Priority:** P0

---

#### TC-KEYGEN-003: Key Entropy and Randomness
**Steps:**
1. Generate 100 API keys
2. Compare for collisions and pattern similarity

**Expected Result:**
- Zero collisions (all keys unique)
- No discernible patterns
- Uses crypto.randomBytes() (cryptographically secure)

**Priority:** P0

---

#### TC-KEYGEN-004: Bcrypt Hashing on Storage
**Steps:**
1. Create API key
2. Query database directly for key_hash

**Expected Result:**
- key_hash starts with "$2a$10$" or "$2b$10$" (bcrypt format)
- key_hash length: 60 characters
- Plaintext key NOT stored anywhere

**Priority:** P0 (CRITICAL SECURITY)

---

#### TC-KEYGEN-005: Key Prefix Stored Correctly
**Steps:**
1. Create API key
2. Verify key_prefix field in database

**Expected Result:**
- key_prefix contains first 16 characters (e.g., "isk_live_AbC123-")
- Used for fast lookup before bcrypt verification

**Priority:** P1

---

#### TC-KEYGEN-006: Plaintext Key Returned Once Only
**Steps:**
1. Create API key via POST /api/keys
2. Retrieve same key via GET /api/keys/:id

**Expected Result:**
- POST response includes `key` field with plaintext
- GET response does NOT include `key` field
- Warning message: "Save it now - it won't be shown again!"

**Priority:** P0 (CRITICAL SECURITY)

---

### Category 2: Key Authentication and Validation

**Purpose:** Verify secure authentication flow

#### TC-AUTH-001: Valid Key Authentication (Header)
**Steps:**
1. Create API key
2. Send request with `X-API-Key: [key]` header

**Expected Result:**
- Authentication succeeds (200 OK)
- req.user populated with user object
- req.userId populated
- req.apiKey populated with key metadata

**Priority:** P0

---

#### TC-AUTH-002: Valid Key Authentication (Query Param)
**Steps:**
1. Create API key
2. Send request with `?api_key=[key]` query parameter

**Expected Result:**
- Authentication succeeds (200 OK)
- Same behavior as header-based auth

**Priority:** P1

---

#### TC-AUTH-003: Invalid Key Format Rejection
**Steps:**
1. Send request with malformed key: "not-a-valid-key"

**Expected Result:**
- 401 Unauthorized
- Error: "Invalid API key format"
- No database queries performed

**Priority:** P0

---

#### TC-AUTH-004: Non-Existent Key Rejection
**Steps:**
1. Send request with valid format but non-existent key: "isk_live_NotInDatabaseXXXXXXXX"

**Expected Result:**
- 401 Unauthorized
- Error: "Invalid API key"
- Bcrypt comparison not attempted (no matching prefix)

**Priority:** P0

---

#### TC-AUTH-005: Revoked Key Rejection
**Steps:**
1. Create API key
2. Revoke key via DELETE /api/keys/:id
3. Attempt authentication with revoked key

**Expected Result:**
- 401 Unauthorized
- Key not found in active keys query
- Status: 'revoked', revoked_at timestamp set

**Priority:** P0

---

#### TC-AUTH-006: Expired Key Rejection
**Steps:**
1. Create API key with expiresIn=1 (1 day)
2. Manually set expires_at to past date in database
3. Attempt authentication

**Expected Result:**
- 401 Unauthorized
- Key excluded from active keys query (expires_at < now)

**Priority:** P0

---

#### TC-AUTH-007: Missing Key Header/Param
**Steps:**
1. Send request without X-API-Key header or api_key param

**Expected Result:**
- 401 Unauthorized
- Error: "Missing API key. Provide via X-API-Key header or api_key query param."

**Priority:** P1

---

#### TC-AUTH-008: User Inactive/Deleted Rejection
**Steps:**
1. Create API key
2. Set user status='inactive' or deleted_at != NULL
3. Attempt authentication

**Expected Result:**
- 401 Unauthorized
- Error: "User not found or inactive"

**Priority:** P0

---

#### TC-AUTH-009: Usage Tracking on Successful Auth
**Steps:**
1. Create API key (total_requests=0, last_used_at=NULL)
2. Authenticate successfully

**Expected Result:**
- total_requests incremented to 1
- last_used_at updated to current timestamp
- first_used_at set to current timestamp (if NULL)

**Priority:** P1

---

#### TC-AUTH-010: Concurrent Key Validation (Race Condition Test)
**Steps:**
1. Create API key
2. Send 10 concurrent requests with same key

**Expected Result:**
- All 10 requests authenticate successfully
- total_requests incremented to 10 (no race condition)
- No database errors or deadlocks

**Priority:** P2

---

### Category 3: Key Lifecycle Management

**Purpose:** Verify CRUD operations and state transitions

#### TC-LIFE-001: Create Key with All Parameters
**Steps:**
1. POST /api/keys with:
   - name: "Production Web App"
   - description: "Main API key for prod"
   - environment: "production"
   - expiresIn: 90 (days)

**Expected Result:**
- 201 Created
- Response includes: id, key (plaintext), key_prefix, name, description, environment, expires_at, created_at
- key_hash stored in DB (not in response)
- expires_at = created_at + 90 days

**Priority:** P0

---

#### TC-LIFE-002: Create Key with Minimal Parameters
**Steps:**
1. POST /api/keys with only name: "Test Key"

**Expected Result:**
- 201 Created
- Defaults applied: environment="production", expiresIn=null (no expiration)

**Priority:** P1

---

#### TC-LIFE-003: Create Key Without Name
**Steps:**
1. POST /api/keys with empty/null name

**Expected Result:**
- 400 Bad Request
- Error: "Name is required" (or allows null, verify behavior)

**Priority:** P2

---

#### TC-LIFE-004: List All Keys for User
**Steps:**
1. Create 3 keys for User A
2. Create 2 keys for User B
3. User A calls GET /api/keys

**Expected Result:**
- Returns only User A's 3 keys (tenant isolation)
- Keys sorted by created_at DESC (newest first)
- key_hash NOT included in response

**Priority:** P0

---

#### TC-LIFE-005: List Keys Includes Expired Keys
**Steps:**
1. Create key with expiresIn=1
2. Manually expire key (set expires_at to past)
3. GET /api/keys

**Expected Result:**
- Expired key included in list
- status='expired' visible to owner
- Keys with status='revoked' also visible

**Priority:** P1

---

#### TC-LIFE-006: Get Key Details by ID
**Steps:**
1. Create key
2. GET /api/keys/:id

**Expected Result:**
- Returns full key metadata (except key_hash and plaintext key)
- Includes: id, name, description, environment, status, created_at, last_used_at, total_requests, expires_at

**Priority:** P1

---

#### TC-LIFE-007: Get Key Details - Cross-Tenant Access Blocked
**Steps:**
1. User A creates key
2. User B attempts GET /api/keys/[User A's key ID]

**Expected Result:**
- 404 Not Found (tenant isolation)
- Key not accessible across user boundaries

**Priority:** P0 (CRITICAL SECURITY)

---

#### TC-LIFE-008: Revoke Key with Reason
**Steps:**
1. Create key
2. DELETE /api/keys/:id with body: { reason: "Compromised" }

**Expected Result:**
- 200 OK
- status updated to 'revoked'
- revoked_at set to current timestamp
- revoked_by_user_id set to requesting user ID
- revoked_reason stored

**Priority:** P0

---

#### TC-LIFE-009: Revoke Key - Idempotent Operation
**Steps:**
1. Create key
2. Revoke key
3. Attempt to revoke same key again

**Expected Result:**
- Second revocation succeeds (or returns 404, verify behavior)
- No errors thrown

**Priority:** P2

---

#### TC-LIFE-010: Revoke Key - Cross-Tenant Access Blocked
**Steps:**
1. User A creates key
2. User B attempts DELETE /api/keys/[User A's key ID]

**Expected Result:**
- 404 Not Found
- Key not revoked (tenant isolation enforced)

**Priority:** P0 (CRITICAL SECURITY)

---

#### TC-LIFE-011: Key Expiration Auto-Detection
**Steps:**
1. Create key with expiresIn=1
2. Wait for expiration (or set expires_at manually)
3. Verify authentication fails
4. Verify GET /api/keys shows status='expired'

**Expected Result:**
- Expired keys excluded from validateKey() query
- Status field reflects expiration

**Priority:** P1

---

### Category 4: Authorization and Tenant Isolation

**Purpose:** Verify multi-tenancy security boundaries

#### TC-TENANT-001: API Key Validates to Correct User
**Steps:**
1. User A creates key_A
2. User B creates key_B
3. Authenticate with key_A

**Expected Result:**
- req.userId = User A's ID
- req.user.email = User A's email

**Priority:** P0

---

#### TC-TENANT-002: Cross-Tenant Key Enumeration Prevented
**Steps:**
1. User A creates 5 keys
2. User B attempts GET /api/keys (while authenticated as User B)

**Expected Result:**
- Returns only User B's keys (0 if none created)
- User A's keys not visible

**Priority:** P0

---

#### TC-TENANT-003: Key Prefix Collision (Different Users)
**Steps:**
1. Generate keys until two users have matching first 16 characters (extremely unlikely but theoretically possible)

**Expected Result:**
- validateKey() correctly distinguishes keys via bcrypt comparison
- Both keys function independently

**Priority:** P2 (Edge case, unlikely)

---

#### TC-TENANT-004: Shared Key Prefix Lookup Integrity
**Steps:**
1. User A creates key with prefix "isk_live_ABC123"
2. Verify pre-authentication query in validateKey() finds correct key

**Expected Result:**
- Query uses key_prefix for fast lookup
- Bcrypt verification ensures correct key matched
- AUDIT WHITELIST: Pre-auth query is correct behavior (cannot scope by user_id yet)

**Priority:** P1

---

### Category 5: Rate Limiting and Abuse Prevention

**Purpose:** Verify protection against API abuse

#### TC-RATE-001: Request Count Tracking
**Steps:**
1. Create key
2. Make 10 requests
3. Verify total_requests = 10

**Expected Result:**
- Counter increments correctly
- No lost increments under concurrent load

**Priority:** P1

---

#### TC-RATE-002: Rate Limit Enforcement (if implemented)
**Steps:**
1. Create free tier key (if rate limiting exists)
2. Send 101 requests in 1 hour (assuming 100/hour limit)

**Expected Result:**
- 101st request rejected with 429 Too Many Requests
- Rate limit headers included (X-RateLimit-Limit, X-RateLimit-Remaining)

**Priority:** P2 (if rate limiting implemented)

---

#### TC-RATE-003: Last Used Timestamp Accuracy
**Steps:**
1. Create key
2. Wait 5 minutes
3. Authenticate
4. Verify last_used_at timestamp

**Expected Result:**
- last_used_at within 1 second of current time
- Timestamp updated on every request

**Priority:** P2

---

#### TC-RATE-004: First Used Timestamp Immutability
**Steps:**
1. Create key (first_used_at = NULL)
2. Authenticate once (first_used_at set)
3. Authenticate again

**Expected Result:**
- first_used_at remains unchanged after first use
- Uses COALESCE to prevent overwrites

**Priority:** P2

---

### Category 6: Security Edge Cases and Attack Vectors

**Purpose:** Verify resilience against security attacks

#### TC-SEC-001: SQL Injection in Key Validation
**Steps:**
1. Attempt authentication with key: `isk_live_' OR '1'='1`

**Expected Result:**
- 401 Unauthorized
- No SQL injection (parameterized queries via Knex)
- No database errors

**Priority:** P0 (CRITICAL SECURITY)

---

#### TC-SEC-002: Timing Attack Resistance (Bcrypt)
**Steps:**
1. Create key
2. Measure response time for valid vs. invalid key authentication
3. Repeat 100 times

**Expected Result:**
- Response times similar (bcrypt comparison time-constant)
- No distinguishable timing difference

**Priority:** P2 (Advanced attack)

---

#### TC-SEC-003: Key Enumeration via Response Timing
**Steps:**
1. Measure response time for:
   - Invalid format key
   - Valid format, non-existent key
   - Valid key
2. Compare timings

**Expected Result:**
- Invalid format: Fast rejection (no DB query)
- Valid format, non-existent: Slightly slower (DB query, no bcrypt)
- Valid key: Slowest (bcrypt verification)
- Timing difference acceptable for usability (not exploitable)

**Priority:** P2

---

#### TC-SEC-004: Brute Force Protection (Rate Limiting)
**Steps:**
1. Attempt 1000 authentications with random invalid keys

**Expected Result:**
- All rejected with 401
- If rate limiting exists, blocked after threshold
- No performance degradation

**Priority:** P1

---

#### TC-SEC-005: Key Length Validation
**Steps:**
1. Attempt authentication with extremely long key (10,000 characters)

**Expected Result:**
- Request rejected (400 Bad Request or 401)
- No performance impact
- No buffer overflow or memory issues

**Priority:** P2

---

#### TC-SEC-006: Special Characters in Key Name/Description
**Steps:**
1. Create key with name: `<script>alert('xss')</script>`
2. Create key with description: `'; DROP TABLE api_keys; --`

**Expected Result:**
- Values stored safely (parameterized queries)
- No XSS or SQL injection
- Values returned correctly in GET requests

**Priority:** P1

---

#### TC-SEC-007: Unicode and Emoji in Key Metadata
**Steps:**
1. Create key with name: "Production 🔑 API"
2. Create key with description: "生产环境密钥"

**Expected Result:**
- Values stored and retrieved correctly
- No encoding issues

**Priority:** P2

---

#### TC-SEC-008: Concurrent Key Creation (Race Condition)
**Steps:**
1. Send 10 concurrent POST /api/keys requests for same user

**Expected Result:**
- All 10 keys created successfully
- All keys have unique plaintext values
- No duplicate key_hash values

**Priority:** P2

---

#### TC-SEC-009: Key Revocation Race Condition
**Steps:**
1. Create key
2. Send concurrent requests:
   - Thread A: DELETE /api/keys/:id (revoke)
   - Thread B: Authenticate with key

**Expected Result:**
- Either Thread B succeeds (revocation not yet committed) or fails (revocation committed)
- No database errors or inconsistent state

**Priority:** P2

---

#### TC-SEC-010: Session Fixation via API Key
**Steps:**
1. User A creates key
2. User A sends key to attacker
3. Attacker uses key to impersonate User A

**Expected Result:**
- Expected behavior: Attacker successfully impersonates User A
- Mitigation: User must revoke key immediately
- Audit log captures all key usage

**Priority:** P1 (Document expected behavior)

---

### Category 7: Performance and Scalability

**Purpose:** Verify performance under load

#### TC-PERF-001: Key Validation Latency
**Steps:**
1. Create key
2. Measure authentication time over 1000 requests

**Expected Result:**
- Average latency: < 50ms per request (bcrypt comparison ~20-30ms)
- p95 latency: < 100ms
- p99 latency: < 150ms

**Priority:** P1

---

#### TC-PERF-002: Bcrypt Rounds Verification
**Steps:**
1. Inspect ApiKeyService.generateKey() code
2. Verify BCRYPT_ROUNDS constant

**Expected Result:**
- BCRYPT_ROUNDS = 10 (balance of security and performance)
- Higher values acceptable but impact latency

**Priority:** P2

---

#### TC-PERF-003: Database Query Efficiency
**Steps:**
1. Enable query logging
2. Authenticate with API key
3. Count number of database queries

**Expected Result:**
- Total queries: 2 (1 for key lookup, 1 for user lookup)
- Both queries use indexes (key_prefix, user_id)
- No N+1 query issues

**Priority:** P2

---

#### TC-PERF-004: Key Listing Performance (Large Dataset)
**Steps:**
1. Create 1000 keys for User A
2. GET /api/keys

**Expected Result:**
- Response time: < 500ms
- Pagination recommended (if not implemented, add to roadmap)
- No memory issues

**Priority:** P2

---

### Category 8: Audit Logging and Compliance

**Purpose:** Verify security audit requirements

#### TC-AUDIT-001: Key Creation Logged
**Steps:**
1. POST /api/keys
2. Check audit_logs or security_audit_logs table

**Expected Result:**
- Event logged: "api_key.created"
- Includes: user_id, key_id, key_prefix, timestamp

**Priority:** P1

---

#### TC-AUDIT-002: Key Revocation Logged
**Steps:**
1. DELETE /api/keys/:id with reason
2. Check audit logs

**Expected Result:**
- Event logged: "api_key.revoked"
- Includes: user_id, key_id, revoked_reason, timestamp

**Priority:** P1

---

#### TC-AUDIT-003: Failed Authentication Logged
**Steps:**
1. Attempt authentication with invalid key
2. Check security_audit_logs

**Expected Result:**
- Event logged: "api_key.auth_failed"
- Includes: attempted key_prefix, IP address, timestamp

**Priority:** P1

---

#### TC-AUDIT-004: Successful Authentication Logged
**Steps:**
1. Authenticate successfully
2. Check audit logs

**Expected Result:**
- Event logged: "api_key.auth_success" (optional, may be too verbose)
- OR usage tracked in api_keys.total_requests
- Balance logging verbosity with storage costs

**Priority:** P2

---

#### TC-AUDIT-005: Compliance Report - Key Inventory
**Steps:**
1. Generate report of all active API keys
2. Verify includes: user, key_prefix, created_at, last_used_at, status

**Expected Result:**
- Report shows all keys across all users (admin only)
- Supports compliance audits (SOC 2, ISO 27001)

**Priority:** P2

---

#### TC-AUDIT-006: Key Rotation Tracking
**Steps:**
1. Create key with name "Production v1"
2. Revoke key
3. Create new key with name "Production v2"
4. Verify audit trail shows rotation

**Expected Result:**
- Clear audit trail of old key revocation + new key creation
- Timestamps show rotation event

**Priority:** P2

---

## Test Execution Summary

| Category | Total Cases | P0 | P1 | P2 |
|----------|-------------|----|----|-------|
| Key Generation & Crypto | 6 | 3 | 2 | 0 |
| Authentication & Validation | 10 | 6 | 3 | 1 |
| Lifecycle Management | 11 | 4 | 5 | 2 |
| Tenant Isolation | 4 | 3 | 1 | 0 |
| Rate Limiting | 4 | 0 | 1 | 3 |
| Security Edge Cases | 10 | 1 | 4 | 5 |
| Performance | 4 | 0 | 1 | 3 |
| Audit & Compliance | 6 | 0 | 3 | 3 |
| **TOTAL** | **52** | **17** | **20** | **15** |

---

## Test Environment

- **Runtime:** Node.js v18+
- **Database:** PostgreSQL 14+ or SQLite (test env)
- **Test Framework:** Jest
- **Coverage Target:** > 90% for Component 8 files
- **CI/CD:** Automated test execution on PR merge

---

## Dependencies

### Internal Dependencies
- ApiKeyService
- Authentication middleware (auth.js)
- Database migrations (api_keys table)
- User management system

### External Dependencies
- bcryptjs (v2.4.3+)
- crypto (Node.js built-in)
- Knex.js (database query builder)

---

## Known Limitations

1. **Single Database:** No distributed session management
2. **Bcrypt Performance:** Authentication ~20-30ms due to bcrypt (acceptable tradeoff)
3. **No Key Rotation Policy:** Manual rotation required (no auto-rotation)
4. **Prefix Collision:** Extremely unlikely but possible (24 random bytes = 2^192 space)

---

## Test Execution Instructions

```bash
# Run all Component 8 tests
npm test -- backend/tests/api-key-management.test.js

# Run with coverage
npm test -- --coverage backend/tests/api-key-management.test.js

# Run specific test category
npm test -- -t "Key Generation and Cryptographic Security"

# Run performance tests
npm test -- -t "Performance"

# Run security edge cases
npm test -- -t "Security Edge Cases"
```

---

## Acceptance Criteria

- [ ] All P0 tests pass (17/17) - **MANDATORY**
- [ ] All P1 tests pass (20/20) - **MANDATORY**
- [ ] >= 90% of P2 tests pass (14/15 minimum)
- [ ] Code coverage >= 90% for Component 8 files
- [ ] No critical security vulnerabilities
- [ ] Performance SLA met (< 50ms average auth latency)
- [ ] Audit logging functional for all key operations

---

## Security Sign-Off Checklist

- [ ] No plaintext keys stored in database
- [ ] Bcrypt hashing used for all keys (10 rounds minimum)
- [ ] Tenant isolation verified (no cross-user access)
- [ ] SQL injection protection verified
- [ ] Rate limiting implemented (or documented as future work)
- [ ] Audit logging captures all security events
- [ ] Key revocation is immediate and effective
- [ ] Expired keys cannot authenticate

---

## Test Plan Author

**QA Lead:** Subagent (Component 8 Audit)  
**Reviewed By:** Enterprise Orchestrator  
**Date:** 2026-03-04  
**Status:** Ready for Execution

---

## Next Steps

1. ✅ **Test Plan Approved** - This document
2. ⬜ **Implement Test Suite** - Create Jest test file
3. ⬜ **Execute Tests** - Run full suite
4. ⬜ **Document Results** - Generate execution report
5. ⬜ **Fix Failures** - Address any failing tests
6. ⬜ **Coverage Analysis** - Verify >= 90% coverage
7. ⬜ **Final Sign-Off** - QA Lead approval
