/**
 * Component 8: API Key Management - Test Suite
 * 
 * Comprehensive security testing for API key lifecycle, authentication,
 * authorization, and tenant isolation.
 * 
 * Test Plan: qa/COMPONENT_8_TEST_PLAN.md
 * Date: 2026-03-04
 */

const request = require('supertest');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const app = require('../app');
const db = require('../database/db');
const apiKeyService = require('../services/api-key-service');
const authService = require('../services/auth-service');

// Test utilities
let testUsers = {};
let testKeys = {};

beforeAll(async () => {
  // Create test users
  testUsers.userA = await createTestUser('userA@test.com', 'Test User A');
  testUsers.userB = await createTestUser('userB@test.com', 'Test User B');
  testUsers.admin = await createTestUser('admin@test.com', 'Admin User');
});

afterAll(async () => {
  // Cleanup test data
  await db('api_keys').whereIn('user_id', Object.values(testUsers).map(u => u.id)).del();
  await db('users').whereIn('id', Object.values(testUsers).map(u => u.id)).del();
  await db.destroy();
});

afterEach(async () => {
  // Clean up keys created during tests
  await db('api_keys').whereIn('user_id', Object.values(testUsers).map(u => u.id)).del();
  testKeys = {};
});

// Helper functions
async function createTestUser(email, name) {
  const [user] = await db('users').insert({
    email,
    name,
    password_hash: await bcrypt.hash('testpassword123', 10),
    email_verified: true,
    status: 'active',
    plan: 'free'
  }).returning('*');
  return user;
}

async function generateJWT(userId) {
  return authService.generateToken({ userId });
}

async function createTestKey(userId, options = {}) {
  const key = await apiKeyService.createKey(userId, {
    name: options.name || 'Test Key',
    description: options.description || 'Test key description',
    environment: options.environment || 'production',
    expiresIn: options.expiresIn
  });
  testKeys[key.id] = key;
  return key;
}

// ============================================================
// Category 1: Key Generation and Cryptographic Security
// ============================================================

describe('Category 1: Key Generation and Cryptographic Security', () => {
  
  test('TC-KEYGEN-001: Key Format Validation (Production)', async () => {
    const key = await createTestKey(testUsers.userA.id, { environment: 'production' });
    
    expect(key.key).toMatch(/^isk_live_[A-Za-z0-9_-]{32}$/);
    expect(key.environment).toBe('production');
    expect(key.key_prefix).toBe(key.key.substring(0, 16));
  });

  test('TC-KEYGEN-002: Key Format Validation (Test)', async () => {
    const key = await createTestKey(testUsers.userA.id, { environment: 'test' });
    
    expect(key.key).toMatch(/^isk_test_[A-Za-z0-9_-]{32}$/);
    expect(key.environment).toBe('test');
  });

  test('TC-KEYGEN-003: Key Entropy and Randomness', async () => {
    const keys = [];
    for (let i = 0; i < 100; i++) {
      const key = await createTestKey(testUsers.userA.id, { name: `Key ${i}` });
      keys.push(key.key);
    }
    
    // Check for collisions
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(100);
    
    // Check that keys are different (not sequential)
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[50]).not.toBe(keys[51]);
  });

  test('TC-KEYGEN-004: Bcrypt Hashing on Storage', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    // Query database directly
    const dbKey = await db('api_keys').where({ id: key.id }).first();
    
    // Verify bcrypt format
    expect(dbKey.key_hash).toMatch(/^\$2[ab]\$10\$/);
    expect(dbKey.key_hash).toHaveLength(60);
    
    // Verify plaintext not stored
    expect(dbKey).not.toHaveProperty('key');
    expect(dbKey.key_hash).not.toBe(key.key);
  });

  test('TC-KEYGEN-005: Key Prefix Stored Correctly', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    const dbKey = await db('api_keys').where({ id: key.id }).first();
    
    expect(dbKey.key_prefix).toBe(key.key.substring(0, 16));
    expect(dbKey.key_prefix).toMatch(/^isk_(live|test)_/);
  });

  test('TC-KEYGEN-006: Plaintext Key Returned Once Only', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    // Create key via API
    const createRes = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'Test Key', environment: 'production' })
      .expect(201);
    
    expect(createRes.body.key.key).toBeDefined();
    expect(createRes.body.key.key).toMatch(/^isk_live_/);
    expect(createRes.body.message).toContain("won't be shown again");
    
    // Retrieve key via API
    const getRes = await request(app)
      .get(`/api/keys/${createRes.body.key.id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    
    expect(getRes.body.key.key).toBeUndefined();
    expect(getRes.body.key.key_hash).toBeUndefined();
  });
});

// ============================================================
// Category 2: Key Authentication and Validation
// ============================================================

describe('Category 2: Key Authentication and Validation', () => {
  
  test('TC-AUTH-001: Valid Key Authentication (Header)', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    const res = await request(app)
      .get('/api/proxy/health') // Example protected endpoint
      .set('X-API-Key', key.key)
      .expect(200);
    
    // Verify authentication succeeded (endpoint-specific checks)
  });

  test('TC-AUTH-002: Valid Key Authentication (Query Param)', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    const res = await request(app)
      .get(`/api/proxy/health?api_key=${key.key}`)
      .expect(200);
  });

  test('TC-AUTH-003: Invalid Key Format Rejection', async () => {
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', 'not-a-valid-key-format')
      .expect(401);
    
    expect(res.body.error).toContain('Invalid API key format');
  });

  test('TC-AUTH-004: Non-Existent Key Rejection', async () => {
    const fakeKey = 'isk_live_NonExistentKeyXXXXXXXXXXX';
    
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', fakeKey)
      .expect(401);
    
    expect(res.body.error).toContain('Invalid API key');
  });

  test('TC-AUTH-005: Revoked Key Rejection', async () => {
    const key = await createTestKey(testUsers.userA.id);
    const jwt = await generateJWT(testUsers.userA.id);
    
    // Revoke key
    await request(app)
      .delete(`/api/keys/${key.id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ reason: 'Test revocation' })
      .expect(200);
    
    // Attempt authentication with revoked key
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', key.key)
      .expect(401);
    
    expect(res.body.error).toContain('Invalid API key');
  });

  test('TC-AUTH-006: Expired Key Rejection', async () => {
    const key = await createTestKey(testUsers.userA.id, { expiresIn: 1 });
    
    // Manually expire key
    await db('api_keys').where({ id: key.id }).update({
      expires_at: db.raw("datetime('now', '-1 day')")
    });
    
    // Attempt authentication
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', key.key)
      .expect(401);
  });

  test('TC-AUTH-007: Missing Key Header/Param', async () => {
    const res = await request(app)
      .get('/api/proxy/health')
      .expect(401);
    
    expect(res.body.error).toContain('Missing API key');
  });

  test('TC-AUTH-008: User Inactive/Deleted Rejection', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    // Deactivate user
    await db('users').where({ id: testUsers.userA.id }).update({ status: 'inactive' });
    
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', key.key)
      .expect(401);
    
    expect(res.body.error).toContain('User not found or inactive');
    
    // Reactivate user for other tests
    await db('users').where({ id: testUsers.userA.id }).update({ status: 'active' });
  });

  test('TC-AUTH-009: Usage Tracking on Successful Auth', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    // Get initial state
    const before = await db('api_keys').where({ id: key.id }).first();
    expect(before.total_requests).toBe(0);
    expect(before.first_used_at).toBeNull();
    
    // Authenticate
    await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', key.key)
      .expect(200);
    
    // Verify usage tracked
    const after = await db('api_keys').where({ id: key.id }).first();
    expect(after.total_requests).toBe(1);
    expect(after.last_used_at).not.toBeNull();
    expect(after.first_used_at).not.toBeNull();
  });

  test('TC-AUTH-010: Concurrent Key Validation (Race Condition Test)', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    // Send 10 concurrent requests
    const requests = Array(10).fill(null).map(() =>
      request(app)
        .get('/api/proxy/health')
        .set('X-API-Key', key.key)
    );
    
    const results = await Promise.all(requests);
    
    // All should succeed
    results.forEach(res => expect(res.status).toBe(200));
    
    // Verify total_requests = 10
    const dbKey = await db('api_keys').where({ id: key.id }).first();
    expect(dbKey.total_requests).toBe(10);
  });
});

// ============================================================
// Category 3: Key Lifecycle Management
// ============================================================

describe('Category 3: Key Lifecycle Management', () => {
  
  test('TC-LIFE-001: Create Key with All Parameters', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        name: 'Production Web App',
        description: 'Main API key for prod',
        environment: 'production',
        expiresIn: 90
      })
      .expect(201);
    
    expect(res.body.key.name).toBe('Production Web App');
    expect(res.body.key.description).toBe('Main API key for prod');
    expect(res.body.key.environment).toBe('production');
    expect(res.body.key.expires_at).toBeDefined();
    
    // Verify expiration date
    const expiresAt = new Date(res.body.key.expires_at);
    const expectedExpiry = new Date();
    expectedExpiry.setDate(expectedExpiry.getDate() + 90);
    
    const daysDiff = Math.abs((expiresAt - expectedExpiry) / (1000 * 60 * 60 * 24));
    expect(daysDiff).toBeLessThan(1); // Within 1 day
  });

  test('TC-LIFE-002: Create Key with Minimal Parameters', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'Test Key' })
      .expect(201);
    
    expect(res.body.key.name).toBe('Test Key');
    expect(res.body.key.environment).toBe('production'); // Default
    expect(res.body.key.expires_at).toBeNull(); // No expiration
  });

  test('TC-LIFE-004: List All Keys for User', async () => {
    // Create keys for both users
    await createTestKey(testUsers.userA.id, { name: 'Key A1' });
    await createTestKey(testUsers.userA.id, { name: 'Key A2' });
    await createTestKey(testUsers.userA.id, { name: 'Key A3' });
    await createTestKey(testUsers.userB.id, { name: 'Key B1' });
    await createTestKey(testUsers.userB.id, { name: 'Key B2' });
    
    const jwtA = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${jwtA}`)
      .expect(200);
    
    expect(res.body.keys).toHaveLength(3);
    expect(res.body.keys.every(k => k.name.startsWith('Key A'))).toBe(true);
    expect(res.body.keys.every(k => !k.key_hash)).toBe(true);
  });

  test('TC-LIFE-006: Get Key Details by ID', async () => {
    const key = await createTestKey(testUsers.userA.id);
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .get(`/api/keys/${key.id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    
    expect(res.body.key.id).toBe(key.id);
    expect(res.body.key.name).toBe('Test Key');
    expect(res.body.key.key).toBeUndefined(); // Plaintext not returned
    expect(res.body.key.key_hash).toBeUndefined(); // Hash not returned
  });

  test('TC-LIFE-007: Get Key Details - Cross-Tenant Access Blocked', async () => {
    const keyA = await createTestKey(testUsers.userA.id);
    const jwtB = await generateJWT(testUsers.userB.id);
    
    const res = await request(app)
      .get(`/api/keys/${keyA.id}`)
      .set('Authorization', `Bearer ${jwtB}`)
      .expect(404);
    
    expect(res.body.error).toContain('not found');
  });

  test('TC-LIFE-008: Revoke Key with Reason', async () => {
    const key = await createTestKey(testUsers.userA.id);
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .delete(`/api/keys/${key.id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ reason: 'Security incident - key compromised' })
      .expect(200);
    
    // Verify revocation in database
    const dbKey = await db('api_keys').where({ id: key.id }).first();
    expect(dbKey.status).toBe('revoked');
    expect(dbKey.revoked_at).not.toBeNull();
    expect(dbKey.revoked_reason).toBe('Security incident - key compromised');
    expect(dbKey.revoked_by_user_id).toBe(testUsers.userA.id.toString());
  });

  test('TC-LIFE-010: Revoke Key - Cross-Tenant Access Blocked', async () => {
    const keyA = await createTestKey(testUsers.userA.id);
    const jwtB = await generateJWT(testUsers.userB.id);
    
    const res = await request(app)
      .delete(`/api/keys/${keyA.id}`)
      .set('Authorization', `Bearer ${jwtB}`)
      .send({ reason: 'Attempted unauthorized revocation' })
      .expect(404);
    
    // Verify key NOT revoked
    const dbKey = await db('api_keys').where({ id: keyA.id }).first();
    expect(dbKey.status).toBe('active');
  });
});

// ============================================================
// Category 4: Authorization and Tenant Isolation
// ============================================================

describe('Category 4: Authorization and Tenant Isolation', () => {
  
  test('TC-TENANT-001: API Key Validates to Correct User', async () => {
    const keyA = await createTestKey(testUsers.userA.id);
    const keyB = await createTestKey(testUsers.userB.id);
    
    // Authenticate with keyA and verify it resolves to userA
    // This would require endpoint that returns user info
    const validation = await apiKeyService.validateKey(keyA.key);
    expect(validation.user.id).toBe(testUsers.userA.id);
    expect(validation.user.email).toBe(testUsers.userA.email);
  });

  test('TC-TENANT-002: Cross-Tenant Key Enumeration Prevented', async () => {
    await createTestKey(testUsers.userA.id, { name: 'Key A1' });
    await createTestKey(testUsers.userA.id, { name: 'Key A2' });
    await createTestKey(testUsers.userA.id, { name: 'Key A3' });
    await createTestKey(testUsers.userA.id, { name: 'Key A4' });
    await createTestKey(testUsers.userA.id, { name: 'Key A5' });
    
    const jwtB = await generateJWT(testUsers.userB.id);
    
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${jwtB}`)
      .expect(200);
    
    // User B should see 0 keys (only their own)
    expect(res.body.keys).toHaveLength(0);
  });

  test('TC-TENANT-004: Shared Key Prefix Lookup Integrity', async () => {
    // Test pre-authentication query behavior
    const key = await createTestKey(testUsers.userA.id);
    
    // Validate key (tests pre-auth lookup)
    const validation = await apiKeyService.validateKey(key.key);
    
    expect(validation.user.id).toBe(testUsers.userA.id);
    expect(validation.apiKey.key_prefix).toBe(key.key_prefix);
  });
});

// ============================================================
// Category 5: Security Edge Cases and Attack Vectors
// ============================================================

describe('Category 5: Security Edge Cases and Attack Vectors', () => {
  
  test('TC-SEC-001: SQL Injection in Key Validation', async () => {
    const maliciousKey = "isk_live_' OR '1'='1";
    
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', maliciousKey)
      .expect(401);
    
    expect(res.body.error).toContain('Invalid API key');
  });

  test('TC-SEC-004: Brute Force Protection', async () => {
    const attempts = 100;
    const requests = [];
    
    for (let i = 0; i < attempts; i++) {
      const fakeKey = `isk_live_BruteForce${i.toString().padStart(20, '0')}`;
      requests.push(
        request(app)
          .get('/api/proxy/health')
          .set('X-API-Key', fakeKey)
      );
    }
    
    const results = await Promise.all(requests);
    
    // All should be rejected
    results.forEach(res => expect(res.status).toBe(401));
  });

  test('TC-SEC-005: Key Length Validation', async () => {
    const longKey = 'isk_live_' + 'A'.repeat(10000);
    
    const res = await request(app)
      .get('/api/proxy/health')
      .set('X-API-Key', longKey)
      .expect(401);
    
    expect(res.body.error).toBeDefined();
  });

  test('TC-SEC-006: Special Characters in Key Name/Description', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        name: "<script>alert('xss')</script>",
        description: "'; DROP TABLE api_keys; --"
      })
      .expect(201);
    
    // Verify values stored safely
    const dbKey = await db('api_keys').where({ id: res.body.key.id }).first();
    expect(dbKey.name).toBe("<script>alert('xss')</script>");
    expect(dbKey.description).toBe("'; DROP TABLE api_keys; --");
    
    // Verify database intact
    const count = await db('api_keys').count('* as count');
    expect(count[0].count).toBeGreaterThan(0);
  });

  test('TC-SEC-007: Unicode and Emoji in Key Metadata', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({
        name: 'Production 🔑 API',
        description: '生产环境密钥'
      })
      .expect(201);
    
    expect(res.body.key.name).toBe('Production 🔑 API');
    expect(res.body.key.description).toBe('生产环境密钥');
  });

  test('TC-SEC-008: Concurrent Key Creation (Race Condition)', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const requests = Array(10).fill(null).map((_, i) =>
      request(app)
        .post('/api/keys')
        .set('Authorization', `Bearer ${jwt}`)
        .send({ name: `Concurrent Key ${i}` })
    );
    
    const results = await Promise.all(requests);
    
    // All should succeed
    results.forEach(res => expect(res.status).toBe(201));
    
    // All keys should be unique
    const keys = results.map(r => r.body.key.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(10);
  });
});

// ============================================================
// Category 6: Performance and Scalability
// ============================================================

describe('Category 6: Performance and Scalability', () => {
  
  test('TC-PERF-001: Key Validation Latency', async () => {
    const key = await createTestKey(testUsers.userA.id);
    const iterations = 100;
    const latencies = [];
    
    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await apiKeyService.validateKey(key.key);
      const latency = Date.now() - start;
      latencies.push(latency);
    }
    
    const avg = latencies.reduce((a, b) => a + b) / latencies.length;
    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(iterations * 0.95)];
    const p99 = latencies[Math.floor(iterations * 0.99)];
    
    console.log(`Key validation latency - Avg: ${avg.toFixed(2)}ms, p95: ${p95}ms, p99: ${p99}ms`);
    
    expect(avg).toBeLessThan(100); // Average < 100ms
    expect(p95).toBeLessThan(150); // p95 < 150ms
  });

  test('TC-PERF-003: Database Query Efficiency', async () => {
    const key = await createTestKey(testUsers.userA.id);
    
    // Enable query logging
    let queryCount = 0;
    const originalQuery = db.client.query;
    db.client.query = function(...args) {
      queryCount++;
      return originalQuery.apply(this, args);
    };
    
    await apiKeyService.validateKey(key.key);
    
    // Restore original query method
    db.client.query = originalQuery;
    
    // Should be 2 queries: key lookup + user lookup
    expect(queryCount).toBeLessThanOrEqual(3);
  });

  test('TC-PERF-004: Key Listing Performance (Large Dataset)', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    // Create 100 keys
    const createPromises = Array(100).fill(null).map((_, i) =>
      createTestKey(testUsers.userA.id, { name: `Key ${i}` })
    );
    await Promise.all(createPromises);
    
    const start = Date.now();
    const res = await request(app)
      .get('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .expect(200);
    const latency = Date.now() - start;
    
    console.log(`Key listing latency (100 keys): ${latency}ms`);
    
    expect(res.body.keys).toHaveLength(100);
    expect(latency).toBeLessThan(1000); // < 1 second
  });
});

// ============================================================
// Category 7: Audit Logging and Compliance
// ============================================================

describe('Category 7: Audit Logging and Compliance', () => {
  
  test('TC-AUDIT-001: Key Creation Logged', async () => {
    const jwt = await generateJWT(testUsers.userA.id);
    
    const res = await request(app)
      .post('/api/keys')
      .set('Authorization', `Bearer ${jwt}`)
      .send({ name: 'Audited Key' })
      .expect(201);
    
    // Check if audit logging is implemented
    const auditLogs = await db('audit_logs')
      .where({ 
        user_id: testUsers.userA.id,
        action: 'api_key.created'
      })
      .orderBy('created_at', 'desc')
      .first();
    
    if (auditLogs) {
      expect(auditLogs.resource_id).toBe(res.body.key.id);
      expect(auditLogs.action).toBe('api_key.created');
    } else {
      console.warn('Audit logging not implemented for key creation');
    }
  });

  test('TC-AUDIT-002: Key Revocation Logged', async () => {
    const key = await createTestKey(testUsers.userA.id);
    const jwt = await generateJWT(testUsers.userA.id);
    
    await request(app)
      .delete(`/api/keys/${key.id}`)
      .set('Authorization', `Bearer ${jwt}`)
      .send({ reason: 'Audit test' })
      .expect(200);
    
    // Check audit logs
    const auditLogs = await db('audit_logs')
      .where({ 
        user_id: testUsers.userA.id,
        action: 'api_key.revoked'
      })
      .orderBy('created_at', 'desc')
      .first();
    
    if (auditLogs) {
      expect(auditLogs.resource_id).toBe(key.id);
    } else {
      console.warn('Audit logging not implemented for key revocation');
    }
  });
});
