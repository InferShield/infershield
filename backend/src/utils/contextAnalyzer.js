/**
 * Context Analyzer - Detection quality improvements
 * Helps reduce false positives by understanding context
 */

/**
 * Check if string is a JWT token
 * @param {string} str - String to check
 * @returns {boolean} - True if it's a JWT
 */
function isJWT(str) {
  if (typeof str !== 'string') return false;
  
  // JWT format: xxxxx.yyyyy.zzzzz (3 Base64 segments separated by dots)
  const jwtPattern = /^[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;
  
  if (!jwtPattern.test(str)) return false;
  
  // Additional check: should have reasonable length
  return str.length > 20 && str.split('.').length === 3;
}

/**
 * Check if string is an API key
 * @param {string} str - String to check
 * @returns {boolean} - True if it's an API key
 */
function isAPIKey(str) {
  if (typeof str !== 'string') return false;
  
  // Common API key patterns (be more specific to avoid false positives)
  const apiKeyPatterns = [
    /^sk-[a-zA-Z0-9]{20,}$/,  // OpenAI style
    /^pk_live_[a-zA-Z0-9]{20,}$/, // Stripe style
    /^pk_test_[a-zA-Z0-9]{20,}$/, // Stripe test
    /^AKIA[A-Z0-9]{16}$/,  // AWS style
    /^AIza[a-zA-Z0-9_-]{35}$/,  // Google API key
    /^ghp_[a-zA-Z0-9]{36}$/,  // GitHub personal token
    /^gho_[a-zA-Z0-9]{36}$/   // GitHub OAuth token
  ];
  
  return apiKeyPatterns.some(pattern => pattern.test(str));
}

/**
 * Check if Base64/code appears in script context
 * @param {string} str - String to check
 * @returns {boolean} - True if has script context
 */
function hasScriptContext(str) {
  if (typeof str !== 'string') return false;
  
  // Check for script tags or JavaScript execution context
  const scriptPatterns = [
    /<script[^>]*>/i,
    /javascript:/i,
    /onerror=/i,
    /onload=/i,
    /eval\(/i,
    /atob\(/i  // Base64 decode in JS
  ];
  
  return scriptPatterns.some(pattern => pattern.test(str));
}

/**
 * Check if pattern appears in SQL query context
 * @param {string} str - String to check
 * @returns {boolean} - True if has SQL context
 */
function hasSQLContext(str) {
  if (typeof str !== 'string') return false;
  
  // Check for SQL query structure
  const sqlPatterns = [
    /\bSELECT\b.*\bFROM\b/i,
    /\bINSERT\s+INTO\b/i,
    /\bUPDATE\b.*\bSET\b/i,
    /\bDELETE\s+FROM\b/i,
    /\bDROP\s+TABLE\b/i,
    /\bUNION\b.*\bSELECT\b/i
  ];
  
  return sqlPatterns.some(pattern => pattern.test(str));
}

module.exports = {
  isJWT,
  isAPIKey,
  hasScriptContext,
  hasSQLContext
};
