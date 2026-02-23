const { validateScenario } = require('./schema');
const { createDetectionPipeline } = require('../../../src/detection/detectionPipeline');
const SessionManager = require('../../../src/session/sessionManager');

const ReplayRunner = {
  async runScenario(scenario, sessionManager, pipeline) {
    validateScenario(scenario);

    // Reset session state for determinism
    sessionManager.sessions.clear();

    const results = [];

    for (const step of scenario.steps) {
      const evaluation = await pipeline.evaluate({
        sessionId: step.sessionId,
        actionType: step.actionType,
        payload: step.payload,
        metadata: step.metadata || {}
      });
      results.push({ step, evaluation });
    }

    // Final result is the last evaluation
    const finalResult = results[results.length - 1].evaluation;
    
    // Check if it matches expected outcome
    const passed = finalResult.allowed === scenario.expectedOutcome.allowed;

    return {
      scenarioId: scenario.id,
      category: scenario.category,
      steps: results,
      finalResult: finalResult,
      expectedOutcome: scenario.expectedOutcome,
      passed: passed,
      failureReason: passed ? null : `Expected allowed=${scenario.expectedOutcome.allowed}, got ${finalResult.allowed}`
    };
  },

  async runAllScenarios(scenarios, sessionManager, pipeline) {
    const results = [];

    for (const scenario of scenarios) {
      try {
        const scenarioResult = await this.runScenario(scenario, sessionManager, pipeline);
        results.push(scenarioResult);
      } catch (error) {
        results.push({ 
          scenarioId: scenario.id, 
          category: scenario.category,
          passed: false,
          error: error.message 
        });
      }
    }

    return results;
  },
};

module.exports = ReplayRunner;
