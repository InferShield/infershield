// Test InferShield Proxy with Real PII Detection
const https = require('https');

console.log('🧪 Testing InferShield Proxy with PII Detection\n');

// Test 1: Clean request (should pass)
console.log('Test 1: Clean Request');
makeRequest({
  prompt: 'What is the capital of France?'
}, 'PASS');

// Wait 2 seconds between tests
setTimeout(() => {
  // Test 2: Request with OpenAI API key (should block)
  console.log('\nTest 2: Request with OpenAI API Key (Should BLOCK)');
  makeRequest({
    prompt: 'My API key is sk-1234567890abcdef1234567890abcdef1234567890abcdef',
    apiKey: 'sk-test-12345'
  }, 'BLOCK');
}, 2000);

setTimeout(() => {
  // Test 3: Request with SSN (should block)
  console.log('\nTest 3: Request with SSN (Should BLOCK)');
  makeRequest({
    prompt: 'My social security number is 123-45-6789'
  }, 'BLOCK');
}, 4000);

setTimeout(() => {
  // Test 4: Request with email (medium risk, should pass with warning)
  console.log('\nTest 4: Request with Email (Should PASS with warning)');
  makeRequest({
    prompt: 'Contact me at john.doe@example.com'
  }, 'PASS');
}, 6000);

function makeRequest(data, expectedResult) {
  const postData = JSON.stringify({
    model: 'gpt-3.5-turbo',
    messages: [
      { role: 'user', content: data.prompt }
    ]
  });

  const options = {
    hostname: 'api.openai.com',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData),
      'Authorization': `Bearer ${data.apiKey || 'invalid-test-token'}`
    },
    // Disable TLS verification for testing (dev only!)
    rejectUnauthorized: false
  };

  const req = https.request(options, (res) => {
    let responseData = '';

    res.on('data', (chunk) => {
      responseData += chunk;
    });

    res.on('end', () => {
      if (res.statusCode === 403) {
        console.log(`✅ RESULT: BLOCKED (Status: ${res.statusCode})`);
        console.log(`   Risk Score: ${res.headers['x-infershield-risk-score']}`);
        try {
          const body = JSON.parse(responseData);
          if (body.error && body.error.detections) {
            console.log(`   Detections: ${body.error.detections.map(d => d.description).join(', ')}`);
          }
        } catch (e) {
          console.log(`   Response: ${responseData.substring(0, 200)}`);
        }
      } else {
        console.log(`✅ RESULT: PASSED (Status: ${res.statusCode})`);
      }
      
      if ((res.statusCode === 403 && expectedResult === 'BLOCK') ||
          (res.statusCode !== 403 && expectedResult === 'PASS')) {
        console.log(`   ✅ Test PASSED (Expected: ${expectedResult})`);
      } else {
        console.log(`   ❌ Test FAILED (Expected: ${expectedResult}, Got: ${res.statusCode === 403 ? 'BLOCK' : 'PASS'})`);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ ERROR: ${e.message}`);
  });

  req.write(postData);
  req.end();
}

console.log('Running tests... (check proxy server logs for details)\n');
