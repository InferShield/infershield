// InferShield PII & Secrets Scanner
// Detects sensitive data in API requests/responses

const PII_PATTERNS = {
  // API Keys
  openai_key: {
    pattern: /\b(sk-[a-zA-Z0-9]{48}|sk-proj-[a-zA-Z0-9]{48,})\b/g,
    type: 'api_key',
    provider: 'openai',
    severity: 'critical',
    description: 'OpenAI API Key'
  },
  anthropic_key: {
    pattern: /\b(sk-ant-[a-zA-Z0-9-]{95,})\b/g,
    type: 'api_key',
    provider: 'anthropic',
    severity: 'critical',
    description: 'Anthropic API Key'
  },
  google_key: {
    pattern: /\b(AIza[a-zA-Z0-9_-]{35})\b/g,
    type: 'api_key',
    provider: 'google',
    severity: 'critical',
    description: 'Google API Key'
  },
  aws_key: {
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    type: 'api_key',
    provider: 'aws',
    severity: 'critical',
    description: 'AWS Access Key'
  },
  github_token: {
    pattern: /\b(gh[ps]_[a-zA-Z0-9]{36,})\b/g,
    type: 'api_key',
    provider: 'github',
    severity: 'critical',
    description: 'GitHub Token'
  },

  // Financial Data
  credit_card: {
    pattern: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|3(?:0[0-5]|[68][0-9])[0-9]{11}|6(?:011|5[0-9]{2})[0-9]{12}|(?:2131|1800|35\d{3})\d{11})\b/g,
    type: 'financial',
    severity: 'high',
    description: 'Credit Card Number'
  },
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b/g,
    type: 'pii',
    severity: 'high',
    description: 'Social Security Number'
  },

  // Personal Information
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Email Address'
  },
  phone: {
    pattern: /\b(?:\+?1[-.]?)?\(?([0-9]{3})\)?[-.]?([0-9]{3})[-.]?([0-9]{4})\b/g,
    type: 'pii',
    severity: 'medium',
    description: 'Phone Number'
  },
  ip_address: {
    pattern: /\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b/g,
    type: 'technical',
    severity: 'low',
    description: 'IP Address'
  }
};

/**
 * Scan text for PII and secrets
 * @param {string} text - Text to scan
 * @returns {Array} Array of detected items with metadata
 */
function detectPII(text) {
  if (!text || typeof text !== 'string') {
    return [];
  }

  const detections = [];
  
  for (const [key, config] of Object.entries(PII_PATTERNS)) {
    const matches = text.match(config.pattern);
    
    if (matches && matches.length > 0) {
      matches.forEach(match => {
        detections.push({
          type: config.type,
          pattern: key,
          value: match,
          severity: config.severity,
          description: config.description,
          provider: config.provider || null,
          position: text.indexOf(match)
        });
      });
    }
  }

  return detections;
}

/**
 * Calculate risk score based on detections
 * @param {Array} detections - Array of detected items
 * @returns {number} Risk score (0-100)
 */
function calculateRiskScore(detections) {
  if (!detections || detections.length === 0) {
    return 0;
  }

  const severityScores = {
    critical: 100,
    high: 75,
    medium: 40,
    low: 15
  };

  // Take the highest severity score
  const maxScore = Math.max(...detections.map(d => severityScores[d.severity] || 0));
  
  // Add bonus for multiple detections
  const detectionBonus = Math.min(detections.length * 5, 25);
  
  return Math.min(maxScore + detectionBonus, 100);
}

/**
 * Determine if request should be blocked
 * @param {Array} detections - Array of detected items
 * @returns {boolean} True if should block
 */
function shouldBlock(detections) {
  if (!detections || detections.length === 0) {
    return false;
  }

  // Block on any critical severity (API keys, AWS keys, etc.)
  return detections.some(d => d.severity === 'critical');
}

/**
 * Redact sensitive values from text
 * @param {string} text - Text to redact
 * @param {Array} detections - Detected items to redact
 * @returns {string} Redacted text
 */
function redactText(text, detections) {
  if (!text || !detections || detections.length === 0) {
    return text;
  }

  let redacted = text;
  
  detections.forEach(detection => {
    const redactedValue = detection.value.substring(0, 8) + '••••••••••••••••';
    redacted = redacted.replace(detection.value, redactedValue);
  });

  return redacted;
}

module.exports = {
  detectPII,
  calculateRiskScore,
  shouldBlock,
  redactText,
  PII_PATTERNS
};
