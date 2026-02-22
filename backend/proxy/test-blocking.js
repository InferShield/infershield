#!/usr/bin/env node
// InferShield Proxy Blocking Test
// Tests that blocking policy actually prevents upstream forwarding

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

const PROXY_PORT = 8888;
const MOCK_SERVER_PORT = 9999;
const TEST_TIMEOUT = 15000; // 15 seconds

let proxyProcess = null;
let mockServer = null;
let testsPassed = 0;
let testsFailed = 0;

/**
 * Create mock upstream server to verify requests reach it (or don't)
 */
function createMockServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let body = '';
      req.on('data', chunk => { body += chunk.toString(); });
      req.on('end', () => {
        console.log(`[Mock Server] Received: ${req.method} ${req.url}`);
        console.log(`[Mock Server] Body: ${body.substring(0, 100)}...`);
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          choices: [{ message: { content: 'Mock response' } }]
        }));
      });
    });
    
    server.listen(MOCK_SERVER_PORT, () => {
      console.log(`✅ Mock server listening on port ${MOCK_SERVER_PORT}`);
      resolve(server);
    });
  });
}

/**
 * Start proxy server as child process
 */
function startProxy() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, 'server.js');
    
    // Set environment variables for test mode
    const env = {
      ...process.env,
      INFERSHIELD_MODE: 'block',
      INFERSHIELD_BLOCK_SEVERITY: 'high',  // Block high+ severity (includes SSN, credit cards)
      INFERSHIELD_MAX_BODY_MB: '5',
      INFERSHIELD_LOG_REDACTED: 'true',
      INFERSHIELD_TEST_MODE: 'true'
    };
    
    proxyProcess = spawn('node', [serverPath], { env });
    
    let output = '';
    
    proxyProcess.stdout.on('data', (data) => {
      output += data.toString();
      process.stdout.write(`[Proxy] ${data}`);
      
      if (output.includes('Proxy server listening on port 8888')) {
        setTimeout(() => resolve(), 1000); // Wait 1s for full startup
      }
    });
    
    proxyProcess.stderr.on('data', (data) => {
      process.stderr.write(`[Proxy Error] ${data}`);
    });
    
    proxyProcess.on('error', (err) => {
      reject(err);
    });
    
    // Timeout if proxy doesn't start
    setTimeout(() => {
      if (!output.includes('running on port')) {
        reject(new Error('Proxy failed to start within timeout'));
      }
    }, 5000);
  });
}

/**
 * Make HTTP request through proxy
 */
function makeProxyRequest(options) {
  return new Promise((resolve, reject) => {
    const reqOptions = {
      host: 'localhost',
      port: PROXY_PORT,
      method: options.method || 'POST',
      path: options.url || `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      }
    };
    
    const req = http.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => { body += chunk.toString(); });
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: body
        });
      });
    });
    
    req.on('error', (err) => {
      reject(err);
    });
    
    if (options.body) {
      req.write(JSON.stringify(options.body));
    }
    
    req.end();
  });
}

/**
 * Test case runner
 */
async function runTest(name, testFn) {
  try {
    console.log(`\n🧪 TEST: ${name}`);
    await testFn();
    console.log(`✅ PASS: ${name}`);
    testsPassed++;
  } catch (error) {
    console.error(`❌ FAIL: ${name}`);
    console.error(`   Error: ${error.message}`);
    testsFailed++;
  }
}

/**
 * Assertion helper
 */
function assert(condition, message) {
  if (!condition) {
    throw new Error(message || 'Assertion failed');
  }
}

/**
 * Main test suite
 */
async function runTests() {
  console.log('🚀 Starting InferShield Proxy Blocking Tests\n');
  
  // Test 1: Block request with API key (critical severity)
  await runTest('Block request with OpenAI API key', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'My API key is sk-1234567890abcdef1234567890abcdef1234567890abcdef' }
        ]
      }
    });
    
    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
    assert(response.headers['x-infershield-blocked'] === 'true', 'Missing blocked header');
    
    const json = JSON.parse(response.body);
    assert(json.error, 'Missing error message');
    assert(json.request_id, 'Missing request_id');
    assert(json.detections && json.detections.length > 0, 'Missing detections');
  });
  
  // Test 2: Block request with SSN (critical severity)
  await runTest('Block request with Social Security Number', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'My SSN is 123-45-6789' }
        ]
      }
    });
    
    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
    assert(response.headers['x-infershield-blocked'] === 'true', 'Missing blocked header');
  });
  
  // Test 3: Block request with credit card (critical severity)
  await runTest('Block request with credit card number', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'My credit card is 4532123456789010' }
        ]
      }
    });
    
    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });
  
  // Test 4: Allow clean request (no PII)
  await runTest('Allow clean request without PII', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'What is the weather today?' }
        ]
      }
    });
    
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
    
    const json = JSON.parse(response.body);
    assert(json.choices, 'Missing mock response data');
  });
  
  // Test 5: Allow request with low-severity PII (email)
  await runTest('Allow request with email (medium severity, below threshold)', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Contact me at test@example.com' }
        ]
      }
    });
    
    // Should allow (email is medium severity, threshold is high)
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
  });
  
  // Test 6: Block Authorization header with API key
  await runTest('Block request with API key in Authorization header', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions`,
      headers: {
        'Authorization': 'Bearer sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      },
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello world' }
        ]
      }
    });
    
    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });
  
  // Test 7: Allow non-AI traffic (should skip scanning)
  await runTest('Allow non-AI traffic without scanning', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/some/other/endpoint`,
      body: {
        data: 'My API key is sk-1234567890abcdef1234567890abcdef1234567890abcdef'
      }
    });
    
    // Non-AI traffic bypasses scanning, should reach mock server
    assert(response.statusCode === 200, `Expected 200, got ${response.statusCode}`);
  });
  
  // Test 8: Block query string with PII
  await runTest('Block request with API key in query string', async () => {
    const response = await makeProxyRequest({
      url: `http://localhost:${MOCK_SERVER_PORT}/v1/chat/completions?api_key=sk-1234567890abcdef1234567890abcdef1234567890abcdef`,
      body: {
        model: 'gpt-4',
        messages: [
          { role: 'user', content: 'Hello' }
        ]
      }
    });
    
    assert(response.statusCode === 403, `Expected 403, got ${response.statusCode}`);
  });
}

/**
 * Cleanup
 */
function cleanup() {
  console.log('\n🧹 Cleaning up...');
  
  if (proxyProcess) {
    proxyProcess.kill();
    console.log('✅ Proxy stopped');
  }
  
  if (mockServer) {
    mockServer.close();
    console.log('✅ Mock server stopped');
  }
}

/**
 * Main entry point
 */
async function main() {
  try {
    // Start mock upstream server
    mockServer = await createMockServer();
    
    // Start proxy
    console.log('🚀 Starting proxy...');
    await startProxy();
    console.log('✅ Proxy started\n');
    
    // Run tests
    await runTests();
    
    // Report results
    console.log('\n' + '='.repeat(60));
    console.log(`📊 TEST RESULTS`);
    console.log('='.repeat(60));
    console.log(`✅ Passed: ${testsPassed}`);
    console.log(`❌ Failed: ${testsFailed}`);
    console.log(`📈 Total:  ${testsPassed + testsFailed}`);
    console.log('='.repeat(60));
    
    // Cleanup
    cleanup();
    
    // Exit with appropriate code
    if (testsFailed > 0) {
      console.error(`\n❌ TESTS FAILED (${testsFailed} failures)`);
      process.exit(1);
    } else {
      console.log(`\n✅ ALL TESTS PASSED`);
      process.exit(0);
    }
  } catch (error) {
    console.error(`\n❌ Test suite error: ${error.message}`);
    console.error(error.stack);
    cleanup();
    process.exit(1);
  }
}

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\n⚠️  Interrupted by user');
  cleanup();
  process.exit(1);
});

// Set timeout for entire test suite
setTimeout(() => {
  console.error('\n❌ Test suite timeout exceeded');
  cleanup();
  process.exit(1);
}, TEST_TIMEOUT);

// Run tests
main();
