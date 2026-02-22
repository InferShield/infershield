const { detectPII } = require('../lib/scanner');
const db = require('../lib/db');

const AI_API_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com'
];

function scanRequest(request, callback) {
  const url = request.url;
  if (AI_API_DOMAINS.some(domain => url.includes(domain))) {
    let requestBody = '';
    request.on('data', chunk => { requestBody += chunk; });
    request.on('end', () => {
      const pii = detectPII(requestBody);
      if (pii.length > 0) {
        db.logDetection(requestBody, pii);
        return callback('block');
      }
      db.logRequest(url, requestBody);
      callback();
    });
  } else {
    callback(); // Allow non-AI traffic
  }
}

function scanResponse(response, callback) {
  let responseBody = '';
  response.on('data', chunk => { responseBody += chunk; });
  response.on('end', () => {
    const pii = detectPII(responseBody);
    if (pii.length > 0) {
      db.logDetection(responseBody, pii);
      return callback('block');
    }
    callback();
  });
}

module.exports = { scanRequest, scanResponse };