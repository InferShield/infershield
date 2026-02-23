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
  DATABASE_READ: /list users|show database|select \* from|query/i,
  FILE_READ: /read file|open file|cat |load from/i,
  EXTERNAL_API_CALL: /POST to|send to|curl|fetch|http|api\..*\.com/i,
  DATA_TRANSFORM: /summarize|format|convert|extract|parse/i,
  PRIVILEGED_WRITE: /delete|drop|remove|modify|update.*admin/i
};

const detectActions = (prompt) => {
  const actions = [];
  for (const [label, regex] of Object.entries(ACTIONS)) {
    if (regex.test(prompt)) {
      actions.push(label);
    }
  }
  return actions;
};

const containsSensitiveData = (text) => {
  return Object.values(sensitivePatterns).some((pattern) => pattern.test(text));
};

const estimatePrivilegeLevel = (prompt) => {
  for (const [level, regex] of Object.entries(privilegeLevels)) {
    if (regex.test(prompt)) {
      return level;
    }
  }
  return 'LOW'; // Default to LOW privilege
};

module.exports = {
  detectActions,
  containsSensitiveData,
  estimatePrivilegeLevel
};