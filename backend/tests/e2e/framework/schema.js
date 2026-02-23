const Ajv = require('ajv');

const ajv = new Ajv();

const scenarioSchema = {
  type: 'object',
  properties: {
    id: { type: 'string' },
    category: { type: 'string' },
    steps: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          sessionId: { type: 'string' },
          actionType: { type: 'string' },
          payload: { type: 'string' },
          metadata: { type: 'object' },
        },
        required: ['sessionId', 'actionType', 'payload'],
        additionalProperties: false,
      },
    },
    expectedOutcome: {
      type: 'object',
      properties: {
        allowed: { type: 'boolean' },
      },
      required: ['allowed'],
      additionalProperties: false,
    },
  },
  required: ['id', 'category', 'steps', 'expectedOutcome'],
  additionalProperties: false,
};

const validateScenario = (scenario) => {
  const validate = ajv.compile(scenarioSchema);
  const valid = validate(scenario);
  if (!valid) {
    throw new Error(`Scenario validation failed: ${ajv.errorsText(validate.errors)}`);
  }
};

module.exports = { validateScenario };
