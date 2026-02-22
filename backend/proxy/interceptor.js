// InferShield Proxy Request/Response Interceptor
const { detectPII, calculateRiskScore, shouldBlock, redactText } = require('../lib/scanner');
const { logRequest, logDetections } = require('../lib/db');

const AI_API_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
  'api.together.xyz'
];

/**
 * Check if URL is an AI API endpoint
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isAIEndpoint(url) {
  return AI_API_DOMAINS.some(domain => url.includes(domain));
}

/**
 * Scan and log incoming request
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback(action) where action is 'block' or null
 */
function scanRequest(ctx, callback) {
  try {
    const url = ctx.clientToProxyRequest.url || '';
    const method = ctx.clientToProxyRequest.method || 'UNKNOWN';
    
    console.log(`📡 [Proxy] ${method} ${url}`);

    if (!isAIEndpoint(url)) {
      // Non-AI traffic - allow and skip scanning
      callback();
      return;
    }

    console.log(`🎯 [AI Traffic Detected] ${url}`);

    let requestBody = '';
    const chunks = [];

    // Collect request body
    ctx.onRequestData((ctx, chunk, callback) => {
      chunks.push(chunk);
      return callback(null, chunk);
    });

    ctx.onRequestEnd(async (ctx, callback) => {
      try {
        requestBody = Buffer.concat(chunks).toString('utf8');
        
        // Scan for PII/secrets
        const detections = detectPII(requestBody);
        const riskScore = calculateRiskScore(detections);
        const blocked = shouldBlock(detections);

        console.log(`🔍 [Scan Result] Risk: ${riskScore}/100, Detections: ${detections.length}, Block: ${blocked}`);

        if (detections.length > 0) {
          console.log(`⚠️  [Detections]:`, detections.map(d => `${d.description} (${d.severity})`).join(', '));
        }

        // Log to database
        const requestId = await logRequest({
          url,
          method,
          requestBody: requestBody.substring(0, 5000), // Limit to 5KB
          riskScore,
          blocked
        });

        if (detections.length > 0) {
          await logDetections(requestId, detections);
        }

        // Block if critical detections found
        if (blocked) {
          console.warn(`🛑 [BLOCKED] Request blocked due to ${detections.length} critical detection(s)`);
          
          ctx.proxyToClientResponse.writeHead(403, {
            'Content-Type': 'application/json',
            'X-InferShield-Blocked': 'true',
            'X-InferShield-Risk-Score': riskScore.toString()
          });
          
          ctx.proxyToClientResponse.end(JSON.stringify({
            error: {
              message: 'Request blocked by InferShield: Sensitive data detected',
              type: 'infershield_security_block',
              risk_score: riskScore,
              detections: detections.map(d => ({
                type: d.type,
                description: d.description,
                severity: d.severity
              }))
            }
          }));
          
          return;
        }

        callback();
      } catch (error) {
        console.error('[Interceptor] Error in scanRequest:', error);
        callback(); // Allow on error (fail open)
      }
    });

    callback();
  } catch (error) {
    console.error('[Interceptor] Error setting up request scan:', error);
    callback(); // Allow on error
  }
}

/**
 * Scan and log outgoing response
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback(action) where action is 'block' or null
 */
function scanResponse(ctx, callback) {
  try {
    const url = ctx.clientToProxyRequest.url || '';

    if (!isAIEndpoint(url)) {
      callback();
      return;
    }

    let responseBody = '';
    const chunks = [];

    // Collect response body
    ctx.onResponseData((ctx, chunk, callback) => {
      chunks.push(chunk);
      return callback(null, chunk);
    });

    ctx.onResponseEnd(async (ctx, callback) => {
      try {
        responseBody = Buffer.concat(chunks).toString('utf8');

        // Scan response for leaked secrets/PII
        const detections = detectPII(responseBody);
        
        if (detections.length > 0) {
          console.log(`⚠️  [Response Scan] Found ${detections.length} detection(s) in response`);
          
          // Log response detections separately
          // Note: We could update the existing request or create a new log entry
          console.log(`📥 [Response Detections]:`, detections.map(d => d.description).join(', '));
        }

        callback();
      } catch (error) {
        console.error('[Interceptor] Error in scanResponse:', error);
        callback(); // Allow on error
      }
    });

    callback();
  } catch (error) {
    console.error('[Interceptor] Error setting up response scan:', error);
    callback();
  }
}

module.exports = { scanRequest, scanResponse };
