// InferShield Proxy Request/Response Interceptor
const crypto = require('crypto');
const zlib = require('zlib');
const { detectPII, calculateRiskScore, redactText } = require('../lib/scanner');
const { logRequest, logDetections } = require('../lib/db');
const { config, isScanningEnabled, shouldBlock: configShouldBlock } = require('../lib/config');

const AI_API_DOMAINS = [
  'api.openai.com',
  'api.anthropic.com',
  'generativelanguage.googleapis.com',
  'api.cohere.ai',
  'api.together.xyz'
];

// Add test endpoints if in test mode
if (process.env.INFERSHIELD_TEST_MODE === 'true' || process.env.NODE_ENV === 'test') {
  AI_API_DOMAINS.push('localhost:9999', '127.0.0.1:9999', 'localhost:8888', '127.0.0.1:8888');
}

/**
 * Check if URL is an AI API endpoint
 * @param {string} url - URL to check
 * @returns {boolean}
 */
function isAIEndpoint(url) {
  // Check if any AI domain is in the URL
  const matchesDomain = AI_API_DOMAINS.some(domain => url.includes(domain));
  
  // In test mode, also accept paths that look like AI endpoints (but not arbitrary paths)
  if (process.env.INFERSHIELD_TEST_MODE === 'true') {
    const testPaths = ['/v1/chat/completions', '/v1/completions', '/v1/embeddings', '/v1/messages'];
    const matchesAIPath = testPaths.some(path => url.includes(path));
    return matchesDomain && matchesAIPath;  // BOTH domain AND path must match in test mode
  }
  
  return matchesDomain;
}

/**
 * Redact Authorization header for safe logging
 * @param {string} authHeader - Authorization header value
 * @returns {string} Redacted version
 */
function redactAuthHeader(authHeader) {
  if (!authHeader) return '';
  
  // Bearer sk-1234567890abcdef... -> Bearer sk-****...****
  const match = authHeader.match(/^(Bearer|Basic)\s+(.+)$/i);
  if (match) {
    const token = match[2];
    if (token.length > 16) {
      return `${match[1]} ${token.substring(0, 8)}****...****${token.substring(token.length - 4)}`;
    }
    return `${match[1]} ****`;
  }
  return 'Bearer ****';
}

/**
 * Decompress gzip data
 * @param {Buffer} buffer - Compressed data
 * @returns {Promise<Buffer>} Decompressed data
 */
function decompressGzip(buffer) {
  return new Promise((resolve, reject) => {
    zlib.gunzip(buffer, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
  });
}

/**
 * Extract query string from URL
 * @param {string} url - Full URL
 * @returns {string} Query string or empty
 */
function getQueryString(url) {
  const qIndex = url.indexOf('?');
  return qIndex >= 0 ? url.substring(qIndex + 1) : '';
}

/**
 * Scan and log incoming request
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback() to continue or block
 */
function scanRequest(ctx, callback) {
  const startTime = Date.now();
  const requestId = crypto.randomUUID();
  
  try {
    const req = ctx.clientToProxyRequest;
    const url = req.url || '';
    const method = req.method || 'UNKNOWN';
    const headers = req.headers || {};
    
    // For HTTP proxy, full URL is in req.url (e.g., http://localhost:9999/path)
    // For HTTPS CONNECT, host is in headers.host
    const targetUrl = url.startsWith('http') ? url : `http://${headers.host}${url}`;
    
    console.log(`📡 [${requestId}] ${method} ${targetUrl}`);

    // Skip scanning if disabled or not AI traffic
    if (!isScanningEnabled() || !isAIEndpoint(targetUrl)) {
      callback();
      return;
    }

    console.log(`🎯 [${requestId}] AI Traffic Detected`);

    const chunks = [];
    let totalSize = 0;
    const maxBytes = config.maxBodySizeMB * 1024 * 1024;
    let bodyExceeded = false;

    // Buffer request body completely before forwarding
    ctx.onRequestData((ctx, chunk, cb) => {
      totalSize += chunk.length;
      
      if (totalSize > maxBytes) {
        bodyExceeded = true;
        console.warn(`⚠️  [${requestId}] Body size exceeded ${config.maxBodySizeMB}MB`);
        // Stop buffering but allow through
        return cb(null, chunk);
      }
      
      chunks.push(chunk);
      return cb(null, chunk); // Continue to forward chunks
    });

    ctx.onRequestEnd(async (ctx, cb) => {
      const latencyMs = Date.now() - startTime;
      
      try {
        let bodyBuffer = chunks.length > 0 ? Buffer.concat(chunks) : Buffer.alloc(0);
        let bodyText = '';
        
        // Decompress if gzip (for scanning only, forward original)
        const contentEncoding = headers['content-encoding'] || '';
        if (contentEncoding.includes('gzip') && bodyBuffer.length > 0) {
          try {
            const decompressed = await decompressGzip(bodyBuffer);
            bodyText = decompressed.toString('utf8');
          } catch (err) {
            console.warn(`⚠️  [${requestId}] Gzip decompression failed, scanning raw`);
            bodyText = bodyBuffer.toString('utf8');
          }
        } else {
          bodyText = bodyBuffer.toString('utf8');
        }

        // Scan multiple sources
        const allDetections = [];
        
        // 1. Scan request body
        if (bodyText.length > 0) {
          const bodyDetections = detectPII(bodyText);
          allDetections.push(...bodyDetections);
        }
        
        // 2. Scan Authorization header (but never log it raw)
        const authHeader = headers['authorization'] || headers['Authorization'];
        if (authHeader) {
          const authDetections = detectPII(authHeader);
          allDetections.push(...authDetections);
        }
        
        // 3. Scan query string
        const queryString = getQueryString(targetUrl);
        if (queryString.length > 0) {
          const queryDetections = detectPII(queryString);
          allDetections.push(...queryDetections);
        }

        // Calculate risk
        const riskScore = calculateRiskScore(allDetections);
        const maxSeverity = allDetections.length > 0
          ? allDetections.reduce((max, d) => {
              const ranks = { critical: 3, high: 2, medium: 1, low: 0 };
              return (ranks[d.severity] || 0) > (ranks[max] || 0) ? d.severity : max;
            }, 'low')
          : 'low';
        
        const blocked = configShouldBlock(maxSeverity);

        console.log(`🔍 [${requestId}] Risk: ${riskScore}/100, Detections: ${allDetections.length}, Severity: ${maxSeverity}, Block: ${blocked}`);

        if (allDetections.length > 0) {
          console.log(`⚠️  [${requestId}] Detections:`, allDetections.map(d => `${d.description} (${d.severity})`).join(', '));
        }

        // Redact body for logging if configured
        const logBody = config.logRedacted && bodyText.length > 0
          ? redactText(bodyText, allDetections).substring(0, 5000)
          : bodyText.substring(0, 5000);

        // Log to database
        await logRequest({
          requestId,
          url: targetUrl,
          method,
          requestBody: logBody,
          riskScore,
          blocked,
          latencyMs
        });

        if (allDetections.length > 0) {
          await logDetections(requestId, allDetections);
        }

        // Block if policy says so
        if (blocked) {
          console.warn(`🛑 [${requestId}] BLOCKED - ${allDetections.length} detection(s)`);
          
          // Mark context as blocked so response handler can skip
          ctx.isBlocked = true;
          
          // Abort upstream connection if it exists
          try {
            if (ctx.proxyToServerRequest) {
              ctx.proxyToServerRequest.destroy();
            }
          } catch (err) {
            // Ignore destroy errors
          }
          
          ctx.proxyToClientResponse.writeHead(403, {
            'Content-Type': 'application/json',
            'X-InferShield-Blocked': 'true',
            'X-InferShield-Request-Id': requestId,
            'X-InferShield-Risk-Score': riskScore.toString()
          });
          
          ctx.proxyToClientResponse.end(JSON.stringify({
            error: 'Blocked by InferShield',
            request_id: requestId,
            risk_score: riskScore,
            detections: allDetections.map(d => ({
              type: d.type,
              description: d.description,
              severity: d.severity
            }))
          }));
          
          return; // Do NOT call cb() - prevents upstream forwarding
        }

        cb(); // Allow request to proceed
      } catch (error) {
        console.error(`❌ [${requestId}] Error in scanRequest:`, error);
        
        // Log error case
        await logRequest({
          requestId,
          url: targetUrl,
          method,
          requestBody: `[Error: ${error.message}]`,
          riskScore: 0,
          blocked: false,
          latencyMs: Date.now() - startTime
        });
        
        cb(); // Fail open
      }
    });

    callback(); // Allow proxy to start forwarding
  } catch (error) {
    console.error(`❌ [${requestId}] Error setting up request scan:`, error);
    callback();
  }
}

/**
 * Scan and log outgoing response
 * @param {Object} ctx - Proxy context
 * @param {Function} callback - Callback() to continue
 */
function scanResponse(ctx, callback) {
  try {
    // Skip if request was blocked
    if (ctx.isBlocked) {
      callback();
      return;
    }
    
    const url = ctx.clientToProxyRequest.url || '';

    if (!isScanningEnabled() || !isAIEndpoint(url)) {
      callback();
      return;
    }

    const chunks = [];

    ctx.onResponseData((ctx, chunk, cb) => {
      try {
        chunks.push(chunk);
        return cb(null, chunk);
      } catch (err) {
        return cb(err);
      }
    });

    ctx.onResponseEnd(async (ctx, cb) => {
      try {
        const responseBody = chunks.length > 0 ? Buffer.concat(chunks).toString('utf8') : '';

        if (responseBody.length > 0) {
          const detections = detectPII(responseBody);
          
          if (detections.length > 0) {
            console.log(`⚠️  [Response] Found ${detections.length} detection(s) in response`);
            console.log(`📥 [Response Detections]:`, detections.map(d => d.description).join(', '));
          }
        }

        cb();
      } catch (error) {
        console.error('[Interceptor] Error in scanResponse onResponseEnd:', error);
        cb();
      }
    });

    callback();
  } catch (error) {
    console.error('[Interceptor] Error setting up response scan:', error);
    callback();
  }
}

module.exports = { scanRequest, scanResponse };
