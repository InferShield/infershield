const sensitivePatterns = {
  email: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i,
  ssn: /\b\d{3}-\d{2}-\d{4}\b/,
  creditCard: /\b(?:\d[ -]*?){13,16}\b/
};

const privilegeLevels = {
  LOW: /\b(my|profile|basic)\b/i,
  MEDIUM: /\b(all users|moderate|group)\b/i,
  HIGH: /\b(delete|admin|reset|all data)\b/i
};

const ACTIONS = {
  DATABASE_READ: /list.*(?:users|database|customers|emails|data|passwords)|show.*(?:database|users|passwords|data)|select \* from|query.*(?:database|users|customers)|from database/i,
  FILE_READ: /read file|open file|cat |load from/i,
  EXTERNAL_API_CALL: /POST to|send (?:to|data to|this to)|curl|fetch|http|api[\s\.]|call.*api|upload to|transmit to/i,
  DATA_TRANSFORM: /summarize|format|convert|extract|parse/i,
  PRIVILEGED_WRITE: /delete|drop|remove|modify|update.*admin/i
};

const detectActions = (prompt) => {
  if (!prompt) return [];
  // Truncate very long prompts to improve performance
  const analyzedPrompt = prompt.length > 5000 ? prompt.substring(0, 5000) : prompt;
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