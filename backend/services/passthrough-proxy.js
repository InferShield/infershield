/**
 * InferShield Passthrough Proxy
 * 
 * OpenAI-API compatible proxy that:
 * 1. Authenticates requests via X-InferShield-Key (InferShield API key)
 * 2. Extracts upstream API key from Authorization header (developer's LLM key)
 * 3. Runs threat detection on request
 * 4. Forwards to upstream provider if allowed (passthrough model - no key custody)
 * 5. Logs request + risk score to tenant-scoped audit_logs
 * 6. Tracks usage for billing
 * 
 * ⚠️ SECURITY CRITICAL: Upstream API keys are NEVER logged, stored, or cached.
 * 
 * ESLint enforcement:
 * // eslint-disable-next-line no-console
 * DO NOT log variables named: upstreamKey, apiKey, authorization, authHeader
 * DO NOT store upstream keys in: database, redis, files, or any persistent storage
 * DO NOT cache upstream keys in: memory stores, session stores, or any cache layer
 * 
 * The upstream key exists ONLY in function scope and is immediately passed to axios
 * for the upstream request, then garbage collected.
 */

const axios = require('axios');
const crypto = require('crypto');
const apiKeyService = require('./api-key-service');
const usageService = require('./usage-service');
const policyEngine = require('./policyEngine');
const db = require('../database/db');

// Upstream provider endpoints
const PROVIDERS = {
  openai: {
    baseUrl: 'https://api.openai.com/v1',
    keyPattern: /^sk-[A-Za-z0-9]{20,}$/,
    keyPrefix: 'sk-',
    name: 'OpenAI'
  },
  anthropic: {
    baseUrl: 'https://api.anthropic.com/v1',
    keyPattern: /^sk-ant-[A-Za-z0-9\-_]{20,}$/,
    keyPrefix: 'sk-ant-',
    name: 'Anthropic'
  }
};

/**
 * Detect provider from API key format
 * @param {string} apiKey - Upstream API key
 * @returns {Object} Provider config or null
 */
function detectProvider(apiKey) {
  if (!apiKey) return null;
  
  for (const [name, config] of Object.entries(PROVIDERS)) {
    if (apiKey.startsWith(config.keyPrefix)) {
      return { ...config, id: name };
    }
  }
  
  // Default to OpenAI for generic sk- keys
  if (apiKey.startsWith('sk-')) {
    return { ...PROVIDERS.openai, id: 'openai' };
  }
  
  return null;
}

/**
 * Extract prompt text from request body
 * @param {Object} body - Request body
 * @returns {string} Extracted prompt
 */
function extractPrompt(body) {
  // OpenAI chat completions
  if (body.messages) {
    return body.messages
      .map(m => `${m.role}: ${m.content}`)
      .join('\n');
  }
  
  // Anthropic messages
  if (body.messages && Array.isArray(body.messages)) {
    return body.messages
      .map(m => `${m.role}: ${typeof m.content === 'string' ? m.content : JSON.stringify(m.content)}`)
      .join('\n');
  }
  
  // Legacy completions
  if (body.prompt) {
    return Array.isArray(body.prompt) ? body.prompt.join('\n') : body.prompt;
  }
  
  return '';
}

/**
 * Authenticate request and extract tenant info
 * @param {Object} headers - Request headers
 * @returns {Promise<Object>} { userId, apiKeyId } or throws
 */
async function authenticateRequest(headers) {
  const infershieldKey = headers['x-infershield-key'];
  
  if (!infershieldKey) {
    const error = new Error('Missing X-InferShield-Key header');
    error.statusCode = 401;
    throw error;
  }
  
  // Validate InferShield API key
  const keyData = await apiKeyService.validateKey(infershieldKey);
  
  if (!keyData || !keyData.userId) {
    const error = new Error('Invalid InferShield API key');
    error.statusCode = 401;
    throw error;
  }
  
  return {
    userId: keyData.userId,
    apiKeyId: keyData.id,
    environment: keyData.environment
  };
}

/**
 * Extract upstream API key from Authorization header
 * @param {Object} headers - Request headers
 * @returns {string} Upstream API key or throws
 */
function extractUpstreamKey(headers) {
  const authHeader = headers.authorization || headers.Authorization;
  
  if (!authHeader) {
    const error = new Error('Missing Authorization header (upstream API key required)');
    error.statusCode = 401;
    throw error;
  }
  
  // Extract Bearer token
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    const error = new Error('Invalid Authorization header format. Expected: Bearer sk-...');
    error.statusCode = 401;
    throw error;
  }
  
  return match[1];
}

/**
 * Analyze request for threats
 * @param {string} prompt - Extracted prompt
 * @param {Object} context - Request context (userId, etc.)
 * @returns {Promise<Object>} { allow, riskScore, violations }
 */
async function analyzeRequest(prompt, context) {
  try {
    const result = await policyEngine.evaluate(
      { prompt },
      { userId: context.userId }
    );
    
    return {
      allow: result.allow,
      riskScore: result.riskScore || 0,
      violations: result.violations || [],
      reason: result.reason
    };
  } catch (error) {
    console.error('[PassthroughProxy] Policy engine error:', error);
    
    // Fail closed on errors
    return {
      allow: false,
      riskScore: 100,
      violations: [{ type: 'system_error', message: 'Policy evaluation failed' }],
      reason: 'System error during threat analysis'
    };
  }
}

/**
 * Forward request to upstream provider
 * @param {string} provider - Provider ID (openai, anthropic)
 * @param {string} path - API path (/chat/completions, etc.)
 * @param {Object} body - Request body
 * @param {string} upstreamKey - Upstream API key (NEVER LOGGED)
 * @param {Object} additionalHeaders - Additional headers to forward
 * @returns {Promise<Object>} Upstream response
 */
async function forwardToUpstream(provider, path, body, upstreamKey, additionalHeaders = {}) {
  const providerConfig = PROVIDERS[provider];
  
  if (!providerConfig) {
    const error = new Error(`Unsupported provider: ${provider}`);
    error.statusCode = 400;
    throw error;
  }
  
  const url = `${providerConfig.baseUrl}${path}`;
  
  try {
    const response = await axios({
      method: 'POST',
      url,
      data: body,
      headers: {
        'Authorization': `Bearer ${upstreamKey}`, // PASSTHROUGH - never stored
        'Content-Type': 'application/json',
        ...additionalHeaders
      },
      validateStatus: () => true // Accept all status codes
    });
    
    return {
      status: response.status,
      data: response.data,
      headers: response.headers
    };
  } catch (error) {
    console.error('[PassthroughProxy] Upstream request failed:', error.message);
    
    return {
      status: 502,
      data: {
        error: {
          message: 'Failed to reach upstream provider',
          type: 'upstream_error',
          provider: providerConfig.name
        }
      }
    };
  }
}

/**
 * Log request to audit_logs (tenant-scoped)
 * @param {Object} context - Request context
 * @param {Object} analysis - Threat analysis result
 * @param {string} provider - Provider ID
 * @returns {Promise<void>}
 */
async function logRequest(context, analysis, provider) {
  try {
    await db('audit_logs').insert({
      user_id: context.userId,
      prompt: context.prompt.substring(0, 5000), // Truncate for storage
      response: context.response ? context.response.substring(0, 5000) : '',
      policy_type: analysis.violations.length > 0 ? analysis.violations[0].type : null,
      severity: analysis.riskScore > 70 ? 'high' : analysis.riskScore > 40 ? 'medium' : 'low',
      risk_score: analysis.riskScore,
      status: analysis.allow ? 'allowed' : 'blocked',
      metadata: JSON.stringify({
        provider,
        environment: context.environment,
        api_key_id: context.apiKeyId,
        violations: analysis.violations
      }),
      created_at: new Date()
    });
  } catch (error) {
    console.error('[PassthroughProxy] Failed to log request:', error);
    // Don't throw - logging failure shouldn't block requests
  }
}

/**
 * Record usage for billing
 * @param {Object} context - Request context
 * @param {string} provider - Provider ID
 * @returns {Promise<void>}
 */
async function recordUsage(context, provider) {
  try {
    await usageService.recordRequest(context.userId, context.apiKeyId, { provider });
  } catch (error) {
    console.error('[PassthroughProxy] Failed to record usage:', error);
    // Don't throw - usage tracking failure shouldn't block requests
  }
}

/**
 * Main proxy handler
 * @param {Object} req - Express request
 * @param {Object} res - Express response
 * @param {string} path - API path (/chat/completions, etc.)
 */
async function handleProxyRequest(req, res, path) {
  const requestId = crypto.randomUUID();
  
  try {
    // Step 1: Authenticate InferShield API key
    const context = await authenticateRequest(req.headers);
    console.log(`[${requestId}] Authenticated user: ${context.userId}`);
    
    // Step 2: Extract upstream API key (NEVER LOGGED BEYOND THIS POINT)
    const upstreamKey = extractUpstreamKey(req.headers);
    
    // Step 3: Detect provider from key format
    const provider = detectProvider(upstreamKey);
    if (!provider) {
      return res.status(400).json({
        error: {
          message: 'Unable to detect upstream provider from API key format',
          type: 'invalid_upstream_key'
        }
      });
    }
    console.log(`[${requestId}] Provider: ${provider.name}`);
    
    // Step 4: Extract prompt for analysis
    const prompt = extractPrompt(req.body);
    context.prompt = prompt;
    
    // Step 5: Analyze for threats
    const analysis = await analyzeRequest(prompt, context);
    console.log(`[${requestId}] Risk score: ${analysis.riskScore}, Allow: ${analysis.allow}`);
    
    // Step 6: Block if policy says so
    if (!analysis.allow) {
      await logRequest(context, analysis, provider.id);
      
      return res.status(400).json({
        error: {
          message: `Request blocked by InferShield: ${analysis.reason}`,
          type: 'security_block',
          risk_score: analysis.riskScore,
          violations: analysis.violations.map(v => ({
            type: v.type,
            message: v.message || v.description
          }))
        }
      });
    }
    
    // Step 7: Forward to upstream provider (passthrough)
    console.log(`[${requestId}] Forwarding to ${provider.name}...`);
    const upstreamResponse = await forwardToUpstream(
      provider.id,
      path,
      req.body,
      upstreamKey, // PASSTHROUGH - not stored
      {
        'User-Agent': 'InferShield-Proxy/1.0'
      }
    );
    
    // Step 8: Log request (tenant-scoped)
    context.response = JSON.stringify(upstreamResponse.data);
    await logRequest(context, analysis, provider.id);
    
    // Step 9: Record usage for billing
    await recordUsage(context, provider.id);
    
    // Step 10: Return upstream response to client
    res.status(upstreamResponse.status).json(upstreamResponse.data);
    
  } catch (error) {
    console.error(`[${requestId}] Error:`, error);
    
    const statusCode = error.statusCode || 500;
    res.status(statusCode).json({
      error: {
        message: error.message || 'Internal server error',
        type: 'proxy_error'
      }
    });
  }
}

module.exports = {
  handleProxyRequest,
  detectProvider,
  authenticateRequest,
  extractPrompt,
  PROVIDERS
};
