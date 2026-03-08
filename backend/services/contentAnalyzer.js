const sensitivePatterns = {
  email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/,
  // API keys and credentials
  openaiKey: /\b(sk-(?:proj-)?[A-Za-z0-9]{20,})\b/g,
  anthropicKey: /\b(sk-ant-[A-Za-z0-9-_]{95,}|anthropic-key-[A-Za-z0-9-_]+)\b/gi,
  awsKey: /\b(AKIA[0-9A-Z]{16})\b/g,
  githubToken: /\b(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{82})\b/g,
  genericApiKey: /\b[A-Za-z0-9_-]{32,}\b/  // Generic long strings that might be keys
};

const privilegeLevels = {
  LOW: /\b(my|profile|basic)\b/i,
  MEDIUM: /\b(all users|moderate|group)\b/i,
  HIGH: /\b(delete|admin|reset|all data)\b/i
};

const ACTIONS = {
  DATABASE_READ: /list.*(?:users|database|customers|emails|data|passwords|keys|records)|show.*(?:database|users|passwords|data|keys|stored|api|records|customer)|select \* from|query.*(?:database|users|customers)|from database|stored\s+(?:keys|credentials|passwords)|what is.*(?:database|schema)/i,
  FILE_READ: /read file|open file|cat |load from/i,
  EXTERNAL_API_CALL: /POST to|send (?:to|data to|this to|aggregated)|curl|fetch|https?:\/\/|hxxps?:\/\/|call.*(?:api|endpoint)|upload to|transmit to|webhook|pastebin|request.*(?:to|from)|endpoint/i,
  DATA_TRANSFORM: /summarize|format|convert|extract|parse|concatenate|aggregate|combine|merge|join/i,
  PRIVILEGED_WRITE: /delete|drop|remove|modify|update.*admin/i
};

/**
 * Normalize URLs to handle common obfuscation
 * @param {string} text - Text potentially containing obfuscated URLs
 * @returns {string} - Normalized text
 */
function normalizeURLs(text) {
  if (!text) return text;
  
  return text
    .replace(/hxxp/gi, 'http')
    .replace(/\[\.\]/g, '.')
    .replace(/\(\.\)/g, '.');
}

const detectActions = (prompt) => {
  if (!prompt) return [];
  
  // Normalize URLs before detection
  const normalizedPrompt = normalizeURLs(prompt);
  
  // Truncate very long prompts to improve performance
  const analyzedPrompt = normalizedPrompt.length > 5000 ? normalizedPrompt.substring(0, 5000) : normalizedPrompt;
  const actions = [];
  for (const [label, regex] of Object.entries(ACTIONS)) {
    if (regex.test(analyzedPrompt)) {
      actions.push(label);
    }
  }
  return actions;
};

const containsSensitiveData = (text) => {
  if (!text) return false;
  // Truncate very long texts to improve performance
  const analyzedText = text.length > 5000 ? text.substring(0, 5000) : text;
  return Object.values(sensitivePatterns).some((pattern) => pattern.test(analyzedText));
};

const estimatePrivilegeLevel = (prompt) => {
  if (!prompt) return 'LOW';
  // Truncate very long prompts to improve performance
  const analyzedPrompt = prompt.length > 5000 ? prompt.substring(0, 5000) : prompt;
  // Check in order of severity: HIGH > MEDIUM > LOW
  if (privilegeLevels.HIGH.test(analyzedPrompt)) {
    return 'HIGH';
  }
  if (privilegeLevels.MEDIUM.test(analyzedPrompt)) {
    return 'MEDIUM';
  }
  if (privilegeLevels.LOW.test(analyzedPrompt)) {
    return 'LOW';
  }
  return 'LOW'; // Default to LOW privilege
};

module.exports = {
  detectActions,
  containsSensitiveData,
  estimatePrivilegeLevel
};