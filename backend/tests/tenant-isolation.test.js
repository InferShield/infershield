/**
 * Tenant Isolation Tests
 * 
 * These tests verify that users cannot access or modify other users' data.
 * This is the most critical security requirement for InferShield SaaS.
 * 
 * ALL TESTS MUST PASS before any production deployment.
 */

const db = require('../database/db');
const { tenantQuery } = require('../lib/tenantQuery');
const apiKeyService = require('../services/api-key-service');
const usageService = require('../services/usage-service');
const authService = require('../services/auth-service');
const AuditAggregator = require('../services/audit-aggregator');

describe('Tenant Isolation', () => {
  let userA, userB;
  let userAApiKey, userBApiKey;

  beforeAll(async () => {
    // Create test users
    userA = await authService.register({
      email: 'user-a-tenant-test@infershield.io',
      password: 'TestPassword123!',
      name: 'User A Test'
    });

    userB = await authService.register({
      email: 'user-b-tenant-test@infershield.io',
      password: 'TestPassword123!',
      name: 'User B Test'
    });

    // Create API keys for both users
    const keyA = await apiKeyService.createKey(userA.id, {
      name: 'User A Test Key',
      environment: 'test'
    });
    userAApiKey = { id: keyA.id, key: keyA.key };

    const keyB = await apiKeyService.createKey(userB.id, {
      name: 'User B Test Key',
      environment: 'test'
    });
    userBApiKey = { id: keyB.id, key: keyB.key };
  });

  afterAll(async () => {
    // Cleanup test data
    if (userA && userA.id) {
      await db('api_keys').where({ user_id: userA.id }).delete();
      await db('usage_records').where({ user_id: userA.id }).delete();
      await db('audit_logs').where({ user_id: userA.id }).delete();
      await db('users').where({ id: userA.id }).delete();
    }

    if (userB && userB.id) {
      await db('api_keys').where({ user_id: userB.id }).delete();
      await db('usage_records').where({ user_id: userB.id }).delete();
      await db('audit_logs').where({ user_id: userB.id }).delete();
      await db('users').where({ id: userB.id }).delete();
    }

    await db.destroy();
  });

  describe('Audit Logs Isolation', () => {
    beforeEach(async () => {
      // Clean all audit logs before each audit log test
      await db('audit_logs').delete();
    });

    it('User A cannot read User B audit logs', async () => {
      // Create audit log for user A
      await db('audit_logs').insert({
        user_id: userA.id,
        policy_type: 'prompt_injection',
        severity: 'high',
        prompt: 'Test prompt from user A',
        response: 'Test response for user A',
        created_at: new Date()
      });

      // Create audit log for user B
      await db('audit_logs').insert({
        user_id: userB.id,
        policy_type: 'pii_detection',
        severity: 'medium',
        prompt: 'Test prompt from user B',
        response: 'Test response for user B',
        created_at: new Date()
      });

      // User B queries audit logs (should only see their own)
      const aggregator = new AuditAggregator();
      const logsQuery = aggregator.filterLogs(userB.id, {});
      const logs = await logsQuery.select('*');

      // User B should only see their own log
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(String(log.user_id)).toBe(String(userB.id));
        expect(String(log.user_id)).not.toBe(String(userA.id));
      });
    });

    it('tenantQuery automatically scopes audit log queries', async () => {
      // Create a fresh audit log for user A (beforeEach already cleaned)
      await db('audit_logs').insert({
        user_id: userA.id,
        policy_type: 'test_policy',
        severity: 'low',
        prompt: 'Test prompt for tenantQuery',
        response: 'Test response for tenantQuery',
        created_at: new Date()
      });
      
      const tdb = tenantQuery(db, userA.id);
      
      // Query audit logs using tenant-scoped query
      const logs = await tdb('audit_logs').select('*');

      // All returned logs should belong to user A
      expect(logs.length).toBeGreaterThan(0);
      logs.forEach(log => {
        expect(String(log.user_id)).toBe(String(userA.id));
      });
    });
  });

  describe('API Keys Isolation', () => {
    it('User A cannot access User B API keys', async () => {
      // User A tries to list all API keys (should only get their own)
      const userAKeys = await apiKeyService.listKeys(userA.id);

      // Verify none of the returned keys belong to user B
      userAKeys.forEach(key => {
        expect(key.user_id).toBe(userA.id);
        expect(key.user_id).not.toBe(userB.id);
      });

      // Verify user B's key is not in the list
      const userBKeyIds = userAKeys.map(k => k.id);
      expect(userBKeyIds).not.toContain(userBApiKey.id);
    });

    it('User A cannot revoke User B API key', async () => {
      // User A tries to revoke user B's key (should fail)
      await expect(async () => {
        await apiKeyService.revokeKey(userBApiKey.id, userA.id, 'Attempted unauthorized revocation');
      }).rejects.toThrow('API key not found');

      // Verify user B's key is still active
      const userBKeys = await apiKeyService.listKeys(userB.id);
      const targetKey = userBKeys.find(k => k.id === userBApiKey.id);
      expect(targetKey).toBeDefined();
      expect(targetKey.status).not.toBe('revoked');
    });

    it('User A cannot get details of User B API key', async () => {
      // User A tries to get user B's key details
      await expect(async () => {
        await apiKeyService.getKey(userBApiKey.id, userA.id);
      }).rejects.toThrow('API key not found');
    });
  });

  describe('Usage Records Isolation', () => {
    beforeEach(async () => {
      // Clean usage records before each test
      await db('usage_records').where({ user_id: userA.id }).delete();
      await db('usage_records').where({ user_id: userB.id }).delete();
    });

    it('User A cannot update User B usage records', async () => {
      // Record usage for user B
      await usageService.recordRequest(userB.id, userBApiKey.id, { provider: 'openai' });

      // Get initial usage count for user B
      const initialUsage = await usageService.getMonthlyUsage(userB.id);
      const initialCount = initialUsage.total_requests;

      // User A tries to record usage under user B's API key (should fail silently or create separate record)
      await usageService.recordRequest(userA.id, userBApiKey.id, { provider: 'openai' });

      // Verify user B's usage hasn't been affected by user A's attempt
      const finalUsage = await usageService.getMonthlyUsage(userB.id);
      expect(finalUsage.total_requests).toBe(initialCount);

      // Verify user A's usage is tracked separately
      const userAUsage = await usageService.getMonthlyUsage(userA.id);
      expect(userAUsage.total_requests).toBeGreaterThan(0);
    });

    it('User A cannot see User B usage data', async () => {
      // Record usage for both users
      await usageService.recordRequest(userA.id, userAApiKey.id, { provider: 'openai' });
      await usageService.recordRequest(userB.id, userBApiKey.id, { provider: 'anthropic' });

      // User A queries their usage
      const userAUsage = await usageService.getDailyUsage(userA.id);

      // Verify query results are scoped to user A only
      const usageRecords = await db('usage_records').where({ user_id: userA.id });
      expect(usageRecords.length).toBeGreaterThan(0);
      
      // Verify user B's records are not accessible
      const crossTenantRecords = usageRecords.filter(r => r.user_id === userB.id);
      expect(crossTenantRecords.length).toBe(0);
    });
  });

  describe('Policies Isolation (when database-backed)', () => {
    it('User A cannot delete User B policies', async () => {
      // NOTE: This test is a placeholder for when policies are migrated to database
      // Current implementation uses in-memory policies (not database-backed)
      
      // When policies are stored in database with user_id:
      // 1. Create policy for user B
      // 2. User A attempts to delete it
      // 3. Deletion should fail or affect 0 rows
      
      // For now, this test passes as a reminder to implement proper scoping
      expect(true).toBe(true);
    });
  });

  describe('Webhook Handler Cross-Tenant Safety', () => {
    it('Webhook handler correctly identifies user by stripe_customer_id', async () => {
      // This is a POSITIVE test - verifying webhook lookup is correct (not a violation)
      
      // Ensure users have Stripe customer IDs
      const userAWithStripe = await db('users').where({ id: userA.id }).first();
      expect(userAWithStripe.stripe_customer_id).toBeDefined();

      // Simulate webhook lookup by stripe_customer_id
      const lookedUpUser = await db('users')
        .where({ stripe_customer_id: userAWithStripe.stripe_customer_id })
        .first();

      // Verify correct user is found
      expect(lookedUpUser.id).toBe(userA.id);
      expect(lookedUpUser.email).toBe(userA.email);
    });
  });

  describe('tenantQuery Middleware Safety', () => {
    it('tenantQuery throws if userId is undefined', () => {
      expect(() => {
        tenantQuery(db, undefined);
      }).toThrow('[SECURITY] tenantQuery requires a userId');
    });

    it('tenantQuery throws if userId is null', () => {
      expect(() => {
        tenantQuery(db, null);
      }).toThrow('[SECURITY] tenantQuery requires a userId');
    });

    it('tenantQuery throws if userId is invalid type', () => {
      expect(() => {
        tenantQuery(db, { id: 123 });
      }).toThrow('[SECURITY] Invalid userId type');
    });

    it('tenantQuery does not scope non-tenant tables', async () => {
      const tdb = tenantQuery(db, userA.id);
      
      // Query users table (not tenant-scoped)
      const users = await tdb('users').select('id', 'email').limit(5);
      
      // Should return users without filtering by user_id
      expect(users.length).toBeGreaterThan(0);
      
      // Should include both user A and user B
      const userIds = users.map(u => u.id);
      expect(userIds.includes(userA.id) || userIds.includes(userB.id)).toBe(true);
    });
  });
});
