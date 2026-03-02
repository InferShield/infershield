/**
 * Auth CLI Commands
 * 
 * CLI commands for OAuth authentication management.
 * Integrates Device Flow components to provide IDE-side authentication trigger.
 * 
 * Commands:
 * - login: Initiate OAuth Device Flow
 * - logout: Revoke tokens
 * - status: Show auth status
 * - refresh: Manually refresh tokens
 * 
 * @module cli/commands/auth
 * @related Issue #1 - OAuth Device Flow (Task 6: IDE Authentication Trigger)
 * @integrates dd34808, 023f61f, a119fa7, e93a382, 082cde8, bd44671
 */

const authServer = require('../../services/oauth/device-flow/authorization-server');
const deviceCodeManager = require('../../services/oauth/device-flow/device-code-manager');
const pollingManager = require('../../services/oauth/device-flow/polling-manager');
const browserLauncher = require('../../services/oauth/device-flow/browser-launcher');
const tokenStorage = require('../../services/oauth/token-storage');
const { DeviceCodeState } = require('../../services/oauth/device-flow/device-code-manager');
const { PollingError } = require('../../services/oauth/device-flow/polling-manager');

/**
 * Login command - Initiate OAuth Device Flow
 * 
 * Flow:
 * 1. Request device authorization (authorization-server.js)
 * 2. Store device code (device-code-manager.js)
 * 3. Display user code and verification URL
 * 4. Launch browser (browser-launcher.js)
 * 5. Poll for token (polling-manager.js)
 * 6. Store token on success (token-storage.js)
 * 
 * @param {Object} options - Command options
 * @param {string} options.provider - OAuth provider
 * @param {string} options.scope - OAuth scopes
 * @param {boolean} options.browser - Whether to launch browser
 */
async function login(options) {
  const { provider, scope, browser: shouldLaunchBrowser } = options;
  
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  InferShield OAuth Authentication                     ║');
  console.log('╚═══════════════════════════════════════════════════════╝\n');
  
  try {
    // ============================================================
    // STEP 1: Request device authorization
    // ============================================================
    
    console.log(`📡 Initiating OAuth Device Flow...`);
    console.log(`   Provider: ${provider}`);
    console.log(`   Scope: ${scope}\n`);
    
    const authRequest = {
      client_id: 'infershield_cli',
      provider_id: provider,
      scope: scope
    };
    
    // Use authorization-server to generate device code
    let deviceAuthResponse;
    await authServer.handleDeviceAuthorizationRequest(
      { body: authRequest },
      {
        status: (code) => ({
          json: (data) => {
            deviceAuthResponse = { statusCode: code, body: data };
            return deviceAuthResponse;
          }
        })
      }
    );
    
    if (deviceAuthResponse.statusCode !== 200) {
      console.error('✗ Failed to initiate device authorization');
      console.error(`Error: ${JSON.stringify(deviceAuthResponse.body)}`);
      process.exit(1);
    }
    
    const {
      device_code,
      user_code,
      verification_uri,
      verification_uri_complete,
      expires_in,
      interval
    } = deviceAuthResponse.body;
    
    console.log('✓ Device authorization initiated\n');
    
    // ============================================================
    // STEP 2: Store device code
    // ============================================================
    
    deviceCodeManager.store(device_code, {
      user_code,
      client_id: authRequest.client_id,
      provider_id: provider,
      scope: scope,
      verification_uri,
      expires_in,
      interval
    });
    
    // ============================================================
    // STEP 3: Display device code and verification URL
    // ============================================================
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('  AUTHORIZATION REQUIRED');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log(`  Your code: ${user_code}\n`);
    console.log(`  Verification URL: ${verification_uri}\n`);
    
    if (verification_uri_complete) {
      console.log(`  Direct URL: ${verification_uri_complete}\n`);
    }
    
    console.log(`  Code expires in: ${expires_in} seconds`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    // ============================================================
    // STEP 4: Launch browser (if enabled)
    // ============================================================
    
    if (shouldLaunchBrowser !== false) {
      console.log('🌐 Launching browser...\n');
      
      const launchResult = await browserLauncher.launchBrowser(
        verification_uri_complete || verification_uri,
        user_code
      );
      
      if (!launchResult.success) {
        console.warn('⚠️  Could not launch browser automatically');
        console.log('   Please open the URL manually in your browser\n');
      }
    } else {
      console.log('⚠️  Automatic browser launch disabled');
      console.log('   Please open the URL manually in your browser\n');
    }
    
    // ============================================================
    // STEP 5: Poll for token
    // ============================================================
    
    console.log('⏳ Waiting for authorization...\n');
    
    // Initialize polling
    await pollingManager.initializePolling(device_code, interval);
    
    let attempts = 0;
    const maxAttempts = Math.ceil(expires_in / interval);
    let currentInterval = interval;
    
    const pollForToken = async () => {
      while (attempts < maxAttempts) {
        attempts++;
        
        // Wait before polling
        await new Promise(resolve => setTimeout(resolve, currentInterval * 1000));
        
        // Check polling rate limits
        const pollResult = await pollingManager.recordPoll(device_code);
        
        if (!pollResult.allowed) {
          if (pollResult.error === PollingError.SLOW_DOWN) {
            console.log(`⚠️  Polling too fast. Slowing down to ${pollResult.interval}s intervals...`);
            currentInterval = pollResult.interval;
          }
          continue;
        }
        
        // Check device code state
        const deviceState = deviceCodeManager.retrieve(device_code);
        
        if (!deviceState) {
          console.error('✗ Device code expired or invalid');
          process.exit(1);
        }
        
        // Check authorization state
        if (deviceState.state === DeviceCodeState.AUTHORIZED) {
          // ============================================================
          // STEP 6: Token received - Store it
          // ============================================================
          
          console.log('✓ Authorization successful!\n');
          
          const { access_token, refresh_token, token_type, expires_in: tokenExpiry } = deviceState.token;
          
          // Store tokens securely
          await tokenStorage.saveToken(provider, {
            access_token: access_token,
            refresh_token: refresh_token,
            token_type: token_type,
            expires_at: Math.floor(Date.now() / 1000) + tokenExpiry,
            scopes: scope.split(' '),
            metadata: {
              deviceCode: device_code,
              userCode: user_code,
              issuedAt: Date.now()
            }
          });
          
          console.log('✓ Tokens stored securely\n');
          console.log('═══════════════════════════════════════════════════════');
          console.log('  Authentication Complete');
          console.log('═══════════════════════════════════════════════════════\n');
          console.log(`  Provider: ${provider}`);
          console.log(`  Scope: ${scope}`);
          console.log(`  Expires in: ${tokenExpiry} seconds\n`);
          console.log('You can now use InferShield with this provider.\n');
          
          // Cleanup
          await pollingManager.cleanupPolling(device_code);
          deviceCodeManager.delete(device_code);
          
          process.exit(0);
        }
        
        if (deviceState.state === DeviceCodeState.DENIED) {
          console.error('✗ Authorization denied by user');
          await pollingManager.cleanupPolling(device_code);
          deviceCodeManager.delete(device_code);
          process.exit(1);
        }
        
        if (deviceState.state === DeviceCodeState.EXPIRED) {
          console.error('✗ Device code expired');
          await pollingManager.cleanupPolling(device_code);
          deviceCodeManager.delete(device_code);
          process.exit(1);
        }
        
        // Still pending - continue polling
        process.stdout.write('.');
      }
      
      console.error('\n\n✗ Authorization timeout - device code expired');
      await pollingManager.cleanupPolling(device_code);
      deviceCodeManager.delete(device_code);
      process.exit(1);
    };
    
    await pollForToken();
    
  } catch (error) {
    console.error('\n✗ Authentication failed');
    console.error(`Error: ${error.message}`);
    
    if (process.env.DEBUG) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }
    
    process.exit(1);
  }
}

/**
 * Logout command - Revoke authentication tokens
 * 
 * @param {Object} options - Command options
 * @param {string} [options.provider] - OAuth provider to logout from
 * @param {boolean} [options.all] - Logout from all providers
 */
async function logout(options) {
  const { provider, all } = options;
  
  console.log('🔐 InferShield OAuth Logout\n');
  
  try {
    if (all) {
      console.log('Revoking all tokens...');
      const providers = await tokenStorage.listProviders();
      for (const provider of providers) {
        await tokenStorage.deleteToken(provider);
      }
      console.log('✓ All tokens revoked\n');
    } else if (provider) {
      console.log(`Revoking tokens for provider: ${provider}...`);
      await tokenStorage.deleteToken(provider);
      console.log(`✓ Tokens for ${provider} revoked\n`);
    } else {
      console.error('✗ Please specify --provider or --all');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('✗ Logout failed');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Status command - Show authentication status
 * 
 * @param {Object} options - Command options
 * @param {boolean} options.json - Output as JSON
 */
async function status(options) {
  const { json } = options;
  
  try {
    const providers = await tokenStorage.listProviders();
    
    // Get token details for each provider
    const tokens = [];
    for (const provider of providers) {
      const tokenData = await tokenStorage.getToken(provider);
      if (tokenData) {
        tokens.push({
          provider,
          scope: tokenData.scopes ? tokenData.scopes.join(' ') : 'unknown',
          expiresAt: tokenData.expires_at * 1000, // Convert to ms
          isExpired: tokenData.expires_at * 1000 < Date.now()
        });
      }
    }
    
    if (json) {
      console.log(JSON.stringify(tokens, null, 2));
      return;
    }
    
    console.log('🔐 InferShield Authentication Status\n');
    console.log('═══════════════════════════════════════════════════════\n');
    
    if (tokens.length === 0) {
      console.log('No active sessions\n');
      console.log('Use: infershield auth login --provider <provider>\n');
      return;
    }
    
    for (const token of tokens) {
      const expiresAt = new Date(token.expiresAt);
      const now = new Date();
      const isExpired = expiresAt < now;
      const timeRemaining = Math.max(0, Math.floor((expiresAt - now) / 1000));
      
      console.log(`Provider: ${token.provider}`);
      console.log(`  Scope: ${token.scope}`);
      console.log(`  Status: ${isExpired ? '❌ Expired' : '✅ Active'}`);
      console.log(`  Expires: ${expiresAt.toLocaleString()}`);
      
      if (!isExpired) {
        const hours = Math.floor(timeRemaining / 3600);
        const minutes = Math.floor((timeRemaining % 3600) / 60);
        console.log(`  Time remaining: ${hours}h ${minutes}m`);
      }
      
      console.log('');
    }
    
  } catch (error) {
    console.error('✗ Failed to retrieve status');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

/**
 * Refresh command - Manually refresh authentication tokens
 * 
 * @param {Object} options - Command options
 * @param {string} options.provider - OAuth provider to refresh
 */
async function refresh(options) {
  const { provider } = options;
  
  if (!provider) {
    console.error('✗ Please specify --provider');
    process.exit(1);
  }
  
  console.log(`🔄 Refreshing tokens for: ${provider}\n`);
  
  try {
    const token = await tokenStorage.getToken(provider);
    
    if (!token) {
      console.error(`✗ No active session for provider: ${provider}`);
      console.log('Use: infershield auth login --provider ' + provider);
      process.exit(1);
    }
    
    // Token refresh logic would go here
    // For now, just confirm the token exists
    console.log('✓ Token refresh not yet implemented');
    console.log('  (Will be implemented in Issue #4: Token Management)\n');
    
  } catch (error) {
    console.error('✗ Token refresh failed');
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  login,
  logout,
  status,
  refresh
};
