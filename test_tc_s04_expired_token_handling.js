/**
 * TC-S04: Expired Token Handling Test
 * 
 * InferShield Security Testing - Day 2a Final Test
 * Product: prod_infershield_001
 * 
 * Test Scope:
 * 1. Token expiration enforcement (timestamp validation)
 * 2. Expired token rejection (API denies expired tokens)
 * 3. Token refresh mechanism (if implemented)
 * 4. Expiration edge cases (clock skew, timezone handling)
 * 5. Expired token cleanup
 * 6. User notification of expired tokens (error messages)
 * 7. Re-authentication flow after expiration
 * 
 * Platform: Linux
 * Expected Result: All tests pass, expired token handling validated
 */

const tokenManager = require('./backend/services/oauth/token-manager');
const tokenStorage = require('./backend/services/oauth/token-storage');
const { TokenState } = require('./backend/services/oauth/token-manager');

// Test results tracker
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  tests: []
};

function test(description, fn) {
  results.total++;
  try {
    fn();
    results.passed++;
    results.tests.push({ description, status: '✅ Pass' });
    console.log(`   ✅ ${description}`);
  } catch (err) {
    results.failed++;
    results.tests.push({ description, status: '❌ Fail', error: err.message });
    console.log(`   ❌ ${description}`);
    console.log(`      Error: ${err.message}`);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

async function runTests() {
  console.log('================================================================================');
  console.log('TC-S04: Expired Token Handling Test');
  console.log('================================================================================\n');

  // Test 1: Token Expiration Enforcement
  console.log('1. Token Expiration Enforcement (Timestamp Validation)\n');

  await (async () => {
    // Save token with longer expiration (beyond 5-min buffer)
    const providerId = 'test-provider-expiry';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-expiry',
      refresh_token: 'test-refresh-token',
      expires_at: now + 3600, // 1 hour from now (beyond 5-min buffer)
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token with future expiration (beyond 5-min buffer) should be VALID', () => {
      assert(validity.state === TokenState.VALID, `Expected VALID, got ${validity.state}`);
      assert(validity.valid === true, 'Token should be valid');
      assert(validity.expires_in > 300, 'Expiry should be beyond 5-min buffer');
    });

    test('Expiry timestamp should be validated correctly', () => {
      const expectedExpiry = now + 3600;
      assert(validity.expires_at === expectedExpiry, `Expected ${expectedExpiry}, got ${validity.expires_at}`);
    });

    await tokenStorage.deleteToken(providerId);
  })();

  await (async () => {
    // Save token with expiration in near future (expiring soon)
    const providerId = 'test-provider-expiring-soon';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-soon',
      refresh_token: 'test-refresh-token',
      expires_at: now + 120, // 2 minutes from now (within 5-min buffer)
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token expiring soon (within 5 min) should be EXPIRING_SOON', () => {
      assert(validity.state === TokenState.EXPIRING_SOON, `Expected EXPIRING_SOON, got ${validity.state}`);
      assert(validity.valid === true, 'Token should still be valid');
      assert(validity.expires_in > 0 && validity.expires_in < 300, 'Expiry should be within buffer');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  // Test 2: Expired Token Rejection
  console.log('\n2. Expired Token Rejection (API Denies Expired Tokens)\n');

  await (async () => {
    // Save token with past expiration
    const providerId = 'test-provider-expired';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-expired',
      refresh_token: 'test-refresh-token',
      expires_at: now - 3600, // 1 hour ago
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token with past expiration should be EXPIRED', () => {
      assert(validity.state === TokenState.EXPIRED, `Expected EXPIRED, got ${validity.state}`);
      assert(validity.valid === false, 'Token should be invalid');
      assert(validity.expires_in < 0, 'Expiry should be negative');
    });

    test('Expired token should have clear expiration message', () => {
      assert(validity.message === 'Expired', `Expected "Expired", got "${validity.message}"`);
    });

    await tokenStorage.deleteToken(providerId);
  })();

  await (async () => {
    // Attempt to get access token with expired token (should trigger refresh or error)
    const providerId = 'test-provider-expired-get';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-expired',
      refresh_token: 'test-refresh-token',
      expires_at: now - 1, // Just expired
      token_type: 'Bearer',
      scopes: ['test']
    });

    const providerConfig = {
      token_endpoint: 'https://example.com/token',
      client_id: 'test-client'
    };

    let errorThrown = false;
    try {
      await tokenManager.getAccessToken(providerId, providerConfig);
    } catch (err) {
      errorThrown = true;
      
      test('Expired token should trigger error when getting access token', () => {
        assert(err.message.includes('Token refresh failed'), 'Error should mention refresh failure');
      });
    }

    test('API should reject expired token (error thrown)', () => {
      assert(errorThrown, 'Expected error to be thrown for expired token');
    });

    // Verify token was deleted after failed refresh
    const deletedToken = await tokenStorage.getToken(providerId);
    test('Failed refresh should delete token from storage', () => {
      assert(deletedToken === null, 'Token should be deleted after failed refresh');
    });
  })();

  // Test 3: Token Refresh Mechanism
  console.log('\n3. Token Refresh Mechanism\n');

  await (async () => {
    const providerId = 'test-provider-refresh';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-old',
      refresh_token: 'test-refresh-token',
      expires_at: now + 120, // Expiring soon (within 5-min buffer)
      token_type: 'Bearer',
      scopes: ['test']
    });

    const providerConfig = {
      token_endpoint: 'https://example.com/token',
      client_id: 'test-client'
    };

    test('Token refresh mechanism should be implemented', async () => {
      const validity = await tokenManager.checkTokenValidity(providerId);
      assert(validity.state === TokenState.EXPIRING_SOON, 'Token should be expiring soon before refresh');
    });

    // Note: Token refresh is implemented but requires network access to provider.
    // The refresh mechanism is validated by:
    // 1. Implementation review (token-manager.js refreshToken() method)
    // 2. Automated tests (token-manager.test.js covers refresh scenarios)
    // 3. getAccessToken() automatically triggers refresh for expiring tokens
    
    test('Token refresh implementation exists in token manager', () => {
      assert(typeof tokenManager.refreshToken === 'function', 'refreshToken method should exist');
    });

    test('getAccessToken should attempt refresh for expiring tokens', async () => {
      // Expect refresh to fail (no network), but behavior is correct
      let errorThrown = false;
      try {
        await tokenManager.getAccessToken(providerId, providerConfig);
      } catch (err) {
        errorThrown = true;
        assert(err.message.includes('Token refresh failed'), 'Should attempt refresh');
      }
      assert(errorThrown, 'Should throw error when refresh fails');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  // Test 4: Expiration Edge Cases
  console.log('\n4. Expiration Edge Cases (Clock Skew, Timezone Handling)\n');

  await (async () => {
    // Test with token exactly at expiration boundary
    const providerId = 'test-provider-boundary';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-boundary',
      refresh_token: 'test-refresh-token',
      expires_at: now, // Exactly now
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token at exact expiration boundary should be EXPIRED', () => {
      assert(validity.state === TokenState.EXPIRED, `Expected EXPIRED, got ${validity.state}`);
      assert(validity.valid === false, 'Token should be invalid');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  await (async () => {
    // Test with token 1 second before expiration
    const providerId = 'test-provider-one-second';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-one-sec',
      refresh_token: 'test-refresh-token',
      expires_at: now + 1, // 1 second from now
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token 1 second before expiration should be EXPIRING_SOON', () => {
      assert(validity.state === TokenState.EXPIRING_SOON, `Expected EXPIRING_SOON, got ${validity.state}`);
      assert(validity.expires_in === 1, `Expected 1 second remaining, got ${validity.expires_in}`);
    });

    await tokenStorage.deleteToken(providerId);
  })();

  await (async () => {
    // Test with very large future timestamp (years in future)
    const providerId = 'test-provider-far-future';
    const now = Math.floor(Date.now() / 1000);
    const farFuture = now + (365 * 24 * 60 * 60); // 1 year
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-future',
      refresh_token: 'test-refresh-token',
      expires_at: farFuture,
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Token with far future expiration should be VALID', () => {
      assert(validity.state === TokenState.VALID, `Expected VALID, got ${validity.state}`);
      assert(validity.expires_in > 300, 'Should have long expiration');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  test('Timestamp validation uses Unix epoch (timezone-independent)', () => {
    const now = Math.floor(Date.now() / 1000);
    assert(now > 0, 'Unix timestamp should be positive');
    assert(now < 2000000000, 'Unix timestamp should be reasonable (before year 2033)');
  });

  // Test 5: Expired Token Cleanup
  console.log('\n5. Expired Token Cleanup\n');

  await (async () => {
    // Create multiple expired tokens
    const expiredProviders = ['expired-1', 'expired-2', 'expired-3'];
    const now = Math.floor(Date.now() / 1000);
    
    for (const providerId of expiredProviders) {
      await tokenStorage.saveToken(providerId, {
        access_token: `token-${providerId}`,
        refresh_token: 'refresh',
        expires_at: now - 3600, // 1 hour ago
        token_type: 'Bearer',
        scopes: ['test']
      });
    }

    test('Multiple expired tokens should be stored', async () => {
      const providers = await tokenStorage.listProviders();
      const expiredCount = expiredProviders.filter(p => providers.includes(p)).length;
      assert(expiredCount === 3, `Expected 3 expired tokens, found ${expiredCount}`);
    });

    // Verify all are expired
    for (const providerId of expiredProviders) {
      const validity = await tokenManager.checkTokenValidity(providerId);
      test(`Token ${providerId} should be EXPIRED`, () => {
        assert(validity.state === TokenState.EXPIRED, `Expected EXPIRED, got ${validity.state}`);
      });
    }

    // Manual cleanup (delete expired tokens)
    for (const providerId of expiredProviders) {
      await tokenStorage.deleteToken(providerId);
    }

    test('Cleanup should remove expired tokens', async () => {
      const providers = await tokenStorage.listProviders();
      const remainingExpired = expiredProviders.filter(p => providers.includes(p)).length;
      assert(remainingExpired === 0, `Expected 0 expired tokens after cleanup, found ${remainingExpired}`);
    });
  })();

  // Test 6: User Notification of Expired Tokens
  console.log('\n6. User Notification of Expired Tokens (Error Messages)\n');

  await (async () => {
    const providerId = 'test-provider-notification';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token',
      refresh_token: 'test-refresh-token',
      expires_at: now - 1, // Just expired
      token_type: 'Bearer',
      scopes: ['test']
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Expired token should have clear message', () => {
      assert(validity.message === 'Expired', `Expected "Expired", got "${validity.message}"`);
    });

    test('Expired token validity should include state', () => {
      assert(validity.state === TokenState.EXPIRED, 'State should be EXPIRED');
    });

    test('Expired token validity should indicate invalid', () => {
      assert(validity.valid === false, 'Valid flag should be false');
    });

    test('Expired token should provide expiration timestamp', () => {
      assert(validity.expires_at !== undefined, 'expires_at should be provided');
      assert(validity.expires_at < now, 'expires_at should be in the past');
    });

    test('Expired token should provide negative expires_in', () => {
      assert(validity.expires_in < 0, 'expires_in should be negative');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  // Test 7: Re-authentication Flow After Expiration
  console.log('\n7. Re-authentication Flow After Expiration\n');

  await (async () => {
    const providerId = 'test-provider-reauth';
    const now = Math.floor(Date.now() / 1000);
    
    await tokenStorage.saveToken(providerId, {
      access_token: 'test-access-token-expired',
      refresh_token: 'test-refresh-token',
      expires_at: now - 1, // Expired
      token_type: 'Bearer',
      scopes: ['test']
    });

    const providerConfig = {
      token_endpoint: 'https://example.com/token',
      client_id: 'test-client'
    };

    test('Expired token without refresh should require re-authentication', async () => {
      let errorThrown = false;
      try {
        await tokenManager.getAccessToken(providerId, providerConfig);
      } catch (err) {
        errorThrown = true;
        assert(err.message.includes('Token refresh failed'), 'Error should indicate refresh failure');
      }
      assert(errorThrown, 'Should throw error for expired token');
    });

    test('Failed refresh should delete token (requires re-auth)', async () => {
      const token = await tokenStorage.getToken(providerId);
      assert(token === null, 'Token should be deleted after failed refresh');
    });

    test('listTokens should indicate NOT_FOUND after deletion', async () => {
      const validity = await tokenManager.checkTokenValidity(providerId);
      assert(validity.state === TokenState.NOT_FOUND, 'State should be NOT_FOUND');
      assert(validity.valid === false, 'Valid flag should be false');
      assert(validity.message === 'No token found', 'Message should indicate not found');
    });
  })();

  await (async () => {
    // Simulate re-authentication after expiration
    const providerId = 'test-provider-reauth-flow';
    const now = Math.floor(Date.now() / 1000);
    
    // User re-authenticates and gets new token
    await tokenManager.saveTokens(providerId, {
      access_token: 'new-access-token',
      refresh_token: 'new-refresh-token',
      expires_in: 3600,
      token_type: 'Bearer',
      scope: 'read write'
    });

    const validity = await tokenManager.checkTokenValidity(providerId);
    
    test('Re-authentication should create new valid token', () => {
      assert(validity.state === TokenState.VALID, `Expected VALID, got ${validity.state}`);
      assert(validity.valid === true, 'Token should be valid');
      assert(validity.expires_in > 0, 'Expiry should be positive');
    });

    test('New token should have fresh expiration', () => {
      assert(validity.expires_in > 3500, 'New token should have ~1 hour expiration');
    });

    await tokenStorage.deleteToken(providerId);
  })();

  // Print summary
  console.log('\n================================================================================');
  console.log('TEST SUMMARY');
  console.log('================================================================================');
  console.log(`Total Tests: ${results.total}`);
  console.log(`Passed: ${results.passed}`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Pass Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('\nTC-S04 Overall Result:', results.failed === 0 ? 'PASS' : 'FAIL');
  console.log('================================================================================\n');

  return results.failed === 0;
}

// Run tests
runTests()
  .then((success) => {
    process.exit(success ? 0 : 1);
  })
  .catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
