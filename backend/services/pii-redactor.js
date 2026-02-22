const crypto = require('crypto');

/**
 * PII Detection and Redaction Service
 * Detects and redacts sensitive data before sending to LLMs
 */

// PII detection patterns
const PII_PATTERNS = {
  // US Social Security Numbers
  ssn: {
    pattern: /\b\d{3}-\d{2}-\d{4}\b|\b\d{9}\b/g,
    name: 'SSN',
    severity: 'critical',
    category: 'government_id'
  },
  
  // Credit card numbers (Luhn algorithm validation)
  credit_card: {
    pattern: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    name: 'Credit Card',
    severity: 'critical',
    category: 'financial',
    validate: (match) => {
      const digits = match.replace(/[-\s]/g, '');
      return luhnCheck(digits);
    }
  },
  
  // Email addresses
  email: {
    pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    name: 'Email',
    severity: 'high',
    category: 'contact'
  },
  
  // US Phone numbers
  phone: {
    pattern: /\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,
    name: 'Phone Number',
    severity: 'medium',
    category: 'contact'
  },
  
  // IP addresses (IPv4)
  ip_address: {
    pattern: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    name: 'IP Address',
    severity: 'medium',
    category: 'network',
    validate: (match) => {
      const parts = match.split('.');
      return parts.every(p => parseInt(p) <= 255);
    }
  },
  
  // US Passport numbers
  passport: {
    pattern: /\b[A-Z]{1,2}\d{6,9}\b/g,
    name: 'Passport Number',
    severity: 'critical',
    category: 'government_id'
  },
  
  // Driver's license (generic pattern)
  drivers_license: {
    pattern: /\b[A-Z]{1,2}\d{5,8}\b/g,
    name: 'Driver\'s License',
    severity: 'high',
    category: 'government_id'
  },
  
  // Medical record numbers (MRN)
  medical_record: {
    pattern: /\bMRN[:\s#-]?\d{6,10}\b/gi,
    name: 'Medical Record Number',
    severity: 'critical',
    category: 'healthcare'
  },
  
  // Bank account numbers
  bank_account: {
    pattern: /\b\d{8,17}\b/g,
    name: 'Bank Account',
    severity: 'critical',
    category: 'financial'
  },
  
  // API keys (generic pattern)
  api_key: {
    pattern: /\b[A-Za-z0-9_-]{32,}\b/g,
    name: 'API Key',
    severity: 'critical',
    category: 'credentials'
  },
  
  // AWS Access Keys
  aws_key: {
    pattern: /\b(AKIA[0-9A-Z]{16})\b/g,
    name: 'AWS Access Key',
    severity: 'critical',
    category: 'credentials'
  },
  
  // OpenAI API Keys
  openai_key: {
    pattern: /\b(sk-(?:proj-)?[A-Za-z0-9]{20,})\b/g,
    name: 'OpenAI API Key',
    severity: 'critical',
    category: 'credentials'
  },
  
  // Anthropic API Keys
  anthropic_key: {
    pattern: /\b(sk-ant-[A-Za-z0-9-_]{95,})\b/g,
    name: 'Anthropic API Key',
    severity: 'critical',
    category: 'credentials'
  },
  
  // GitHub Personal Access Tokens
  github_token: {
    pattern: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/g,
    name: 'GitHub Token',
    severity: 'critical',
    category: 'credentials'
  },
  
  // Date of birth
  date_of_birth: {
    pattern: /\b(?:0?[1-9]|1[0-2])[-/](?:0?[1-9]|[12]\d|3[01])[-/](?:19|20)\d{2}\b/g,
    name: 'Date of Birth',
    severity: 'medium',
    category: 'personal'
  }
};

// Luhn algorithm for credit card validation
function luhnCheck(cardNumber) {
  const digits = cardNumber.split('').map(Number);
  let sum = 0;
  let isEven = false;
  
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = digits[i];
    
    if (isEven) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    
    sum += digit;
    isEven = !isEven;
  }
  
  return sum % 10 === 0;
}

/**
 * Detect PII in text
 * @param {string} text - Text to scan
 * @param {Object} options - Detection options
 * @returns {Array} - Array of detected PII items
 */
function detectPII(text, options = {}) {
  const {
    patterns = Object.keys(PII_PATTERNS),
    validateMatches = true
  } = options;
  
  const detectedPII = [];
  
  for (const patternKey of patterns) {
    const piiDef = PII_PATTERNS[patternKey];
    if (!piiDef) continue;
    
    const matches = text.matchAll(piiDef.pattern);
    
    for (const match of matches) {
      const value = match[0];
      
      // Validate match if validator exists
      if (validateMatches && piiDef.validate && !piiDef.validate(value)) {
        continue;
      }
      
      detectedPII.push({
        type: patternKey,
        name: piiDef.name,
        value,
        position: match.index,
        length: value.length,
        severity: piiDef.severity,
        category: piiDef.category
      });
    }
  }
  
  // Sort by position
  return detectedPII.sort((a, b) => a.position - b.position);
}

/**
 * Redaction strategies
 */
const RedactionStrategy = {
  // Replace with fixed string
  MASK: 'mask',
  
  // Replace with pattern preserving mask (e.g., XXX-XX-1234 for SSN)
  PARTIAL: 'partial',
  
  // Replace with hash
  HASH: 'hash',
  
  // Replace with token (reversible)
  TOKEN: 'token',
  
  // Remove completely
  REMOVE: 'remove'
};

/**
 * Redact PII from text
 * @param {string} text - Text to redact
 * @param {Object} options - Redaction options
 * @returns {Object} - Redacted text and metadata
 */
function redactPII(text, options = {}) {
  const {
    strategy = RedactionStrategy.MASK,
    patterns = Object.keys(PII_PATTERNS),
    tokenKey = process.env.PII_TOKEN_KEY || 'default-key'
  } = options;
  
  const detected = detectPII(text, { patterns });
  
  if (detected.length === 0) {
    return {
      redacted: text,
      original: text,
      detections: [],
      changed: false
    };
  }
  
  let redacted = text;
  const tokens = {};
  let offset = 0;
  
  for (const pii of detected) {
    const { type, value, position, length } = pii;
    const actualPosition = position + offset;
    
    let replacement;
    
    switch (strategy) {
      case RedactionStrategy.MASK:
        replacement = `[${pii.name.toUpperCase()}_REDACTED]`;
        break;
      
      case RedactionStrategy.PARTIAL:
        replacement = getPartialMask(value, type);
        break;
      
      case RedactionStrategy.HASH:
        replacement = `[${hashValue(value)}]`;
        break;
      
      case RedactionStrategy.TOKEN:
        const token = generateToken(value, tokenKey);
        tokens[token] = value;
        replacement = `[TOKEN_${token}]`;
        break;
      
      case RedactionStrategy.REMOVE:
        replacement = '';
        break;
      
      default:
        replacement = `[${pii.name.toUpperCase()}_REDACTED]`;
    }
    
    // Replace in text
    redacted = redacted.substring(0, actualPosition) + 
               replacement + 
               redacted.substring(actualPosition + length);
    
    // Update offset for subsequent replacements
    offset += replacement.length - length;
  }
  
  return {
    redacted,
    original: text,
    detections: detected,
    tokens: Object.keys(tokens).length > 0 ? tokens : undefined,
    changed: true
  };
}

/**
 * Generate partial mask (show last 4 digits)
 */
function getPartialMask(value, type) {
  if (type === 'ssn') {
    const digits = value.replace(/\D/g, '');
    return `XXX-XX-${digits.slice(-4)}`;
  }
  
  if (type === 'credit_card') {
    const digits = value.replace(/\D/g, '');
    return `XXXX-XXXX-XXXX-${digits.slice(-4)}`;
  }
  
  if (type === 'email') {
    const [local, domain] = value.split('@');
    return `${local[0]}***@${domain}`;
  }
  
  if (type === 'phone') {
    const digits = value.replace(/\D/g, '');
    return `XXX-XXX-${digits.slice(-4)}`;
  }
  
  // Default: show last 4 chars
  return `${'*'.repeat(Math.max(0, value.length - 4))}${value.slice(-4)}`;
}

/**
 * Hash value (one-way)
 */
function hashValue(value) {
  return crypto.createHash('sha256').update(value).digest('hex').substring(0, 8);
}

/**
 * Generate token (reversible with key)
 */
function generateToken(value, key) {
  const cipher = crypto.createCipher('aes-256-cbc', key);
  let encrypted = cipher.update(value, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  return encrypted.substring(0, 16);
}

/**
 * Detokenize value
 */
function detokenize(token, value, key) {
  const decipher = crypto.createDecipher('aes-256-cbc', key);
  let decrypted = decipher.update(value, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

/**
 * Express middleware for PII redaction
 */
function piiRedactionMiddleware(options = {}) {
  return (req, res, next) => {
    const {
      enabled = true,
      strategy = RedactionStrategy.MASK,
      patterns = Object.keys(PII_PATTERNS)
    } = options;
    
    if (!enabled) {
      return next();
    }
    
    // Redact request body (for proxied LLM requests)
    if (req.body && req.body.prompt) {
      const result = redactPII(req.body.prompt, { strategy, patterns });
      
      if (result.changed) {
        req.body.prompt = result.redacted;
        req.piiRedacted = true;
        req.piiDetections = result.detections;
        req.piiTokens = result.tokens;
        
        // Log redaction
        console.log(`[PII] Redacted ${result.detections.length} items from request`);
      }
    }
    
    // Redact messages array (for chat completions)
    if (req.body && req.body.messages) {
      let totalRedacted = 0;
      
      req.body.messages = req.body.messages.map(msg => {
        if (msg.content) {
          const result = redactPII(msg.content, { strategy, patterns });
          
          if (result.changed) {
            totalRedacted += result.detections.length;
            return { ...msg, content: result.redacted };
          }
        }
        return msg;
      });
      
      if (totalRedacted > 0) {
        req.piiRedacted = true;
        console.log(`[PII] Redacted ${totalRedacted} items from messages`);
      }
    }
    
    next();
  };
}

module.exports = {
  PII_PATTERNS,
  RedactionStrategy,
  detectPII,
  redactPII,
  piiRedactionMiddleware,
  detokenize
};
