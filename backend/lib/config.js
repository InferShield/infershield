// InferShield Centralized Policy Configuration
// Reads environment variables with safe defaults

/**
 * Parse boolean from string safely
 * @param {string} value - String value to parse
 * @param {boolean} defaultValue - Default if invalid
 * @returns {boolean}
 */
function parseBoolean(value, defaultValue) {
  if (value === undefined || value === null) {
    return defaultValue;
  }
  const str = String(value).toLowerCase();
  if (str === 'true' || str === '1') return true;
  if (str === 'false' || str === '0') return false;
  return defaultValue;
}

/**
 * Configuration object with environment variable overrides
 */
const config = {
  mode: process.env.INFERSHIELD_MODE || 'block', // block | warn | off
  blockSeverity: process.env.INFERSHIELD_BLOCK_SEVERITY || 'critical', // critical | high | medium | low
  logRedacted: parseBoolean(process.env.INFERSHIELD_LOG_REDACTED, true),
  storeResponseBody: parseBoolean(process.env.INFERSHIELD_STORE_RESPONSE_BODY, false),
  maxBodySizeMB: parseInt(process.env.INFERSHIELD_MAX_BODY_SIZE_MB || '5', 10)
};

/**
 * Severity ranking for comparison
 */
const severityRank = {
  critical: 3,
  high: 2,
  medium: 1,
  low: 0
};

/**
 * Check if scanning is enabled based on mode
 * @returns {boolean} True if scanning should be performed
 */
function isScanningEnabled() {
  return config.mode !== 'off';
}

/**
 * Determine if a request should be blocked based on severity and policy
 * @param {string} maxSeverityFound - Highest severity detected (critical, high, medium, low)
 * @returns {boolean} True if request should be blocked
 */
function shouldBlock(maxSeverityFound) {
  if (config.mode !== 'block') {
    return false;
  }
  
  const foundRank = severityRank[maxSeverityFound] || 0;
  const thresholdRank = severityRank[config.blockSeverity] || 0;
  
  return foundRank >= thresholdRank;
}

module.exports = {
  config,
  isScanningEnabled,
  shouldBlock,
  severityRank
};
