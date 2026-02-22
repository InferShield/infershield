// TODO: Integration with real scanner (Option 2)
// const { detectPII } = require('../lib/scanner');
// const db = require('../lib/db');

const AI_API_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com'
];

function scanRequest(request, callback) {
  const url = request.url;
  
  if (AI_API_DOMAINS.some(domain => url.includes(domain))) {
    console.log(`🎯 [AI Traffic Detected] ${url}`);
    
    // Stub: Just log for now, real scanning in Option 2
    let requestBody = '';
    request.on('data', chunk => { 
      requestBody += chunk.toString(); 
    });
    request.on('end', () => {
      if (requestBody) {
        console.log(`📤 [Request Body] ${requestBody.substring(0, 200)}${requestBody.length > 200 ? '...' : ''}`);
      }
      // TODO: Real PII detection here
      // const pii = detectPII(requestBody);
      // if (pii.length > 0) return callback('block');
      callback(); // Allow all for now
    });
  } else {
    callback(); // Allow non-AI traffic
  }
}

function scanResponse(response, callback) {
  // Stub: Just allow for now, real scanning in Option 2
  console.log(`📥 [Response Received]`);
  callback();
}

module.exports = { scanRequest, scanResponse };