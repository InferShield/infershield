/**
 * Scenario Schema Validator
 * Zero external dependencies - simple validation logic
 */

function validateScenario(scenario) {
  const errors = [];

  // Check required top-level fields
  if (!scenario.id || typeof scenario.id !== 'string') {
    errors.push('Field "id" is required and must be a string');
  }
  
  if (!scenario.category || typeof scenario.category !== 'string') {
    errors.push('Field "category" is required and must be a string');
  }
  
  if (!Array.isArray(scenario.steps)) {
    errors.push('Field "steps" is required and must be an array');
  } else {
    // Validate each step
    scenario.steps.forEach((step, index) => {
      if (!step.sessionId || typeof step.sessionId !== 'string') {
        errors.push(`Step ${index}: "sessionId" is required and must be a string`);
      }
      
      if (!step.actionType || typeof step.actionType !== 'string') {
        errors.push(`Step ${index}: "actionType" is required and must be a string`);
      }
      
      if (!step.payload || typeof step.payload !== 'string') {
        errors.push(`Step ${index}: "payload" is required and must be a string`);
      }
      
      // metadata is optional but must be an object if present
      if (step.metadata !== undefined && typeof step.metadata !== 'object') {
        errors.push(`Step ${index}: "metadata" must be an object if provided`);
      }
    });
  }
  
  if (!scenario.expectedOutcome || typeof scenario.expectedOutcome !== 'object') {
    errors.push('Field "expectedOutcome" is required and must be an object');
  } else {
    if (typeof scenario.expectedOutcome.allowed !== 'boolean') {
      errors.push('Field "expectedOutcome.allowed" is required and must be a boolean');
    }
  }
  
  if (errors.length > 0) {
    throw new Error(`Scenario validation failed:\n${errors.join('\n')}`);
  }
  
  return true;
}

/**
 * Schema documentation for scenario corpus generation
 */
const SCHEMA_DOC = `
Scenario JSON Schema:

{
  "id": "string (required) - Unique identifier, e.g. 'attack_001' or 'benign_jwt_001'",
  "category": "string (required) - Category, e.g. 'prompt_injection', 'jwt_handling'",
  "steps": [
    {
      "sessionId": "string (required) - Session identifier for grouping multi-step scenarios",
      "actionType": "string (required) - Action type, e.g. 'READ', 'WRITE', 'TRANSFORM'",
      "payload": "string (required) - THE ACTUAL TEXT CONTENT TO ANALYZE (not an object!)",
      "metadata": "object (optional) - Additional metadata"
    }
  ],
  "expectedOutcome": {
    "allowed": "boolean (required) - false for attacks (should block), true for benign (should allow)"
  }
}

Key constraints:
- payload MUST be a string (the actual text content)
- expectedOutcome.allowed = false means "this should be blocked" (attack)
- expectedOutcome.allowed = true means "this should be allowed" (benign)
- All fields are case-sensitive
- No additional fields allowed at top level
`;

module.exports = { 
  validateScenario,
  SCHEMA_DOC
};
