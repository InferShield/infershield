const { validateScenario } = require('./schema');
const detectionPipeline = require('../../../../src/detection/detectionPipeline');

const ReplayRunner = {
  async runScenario(scenario) {
    validateScenario(scenario);

    const results = [];

    for (const step of scenario.steps) {
      const evaluation = await detectionPipeline.evaluate(step);
      results.push({ step, evaluation });
    }

    return results;
  },

  async runAllScenarios(scenarios) {
    const results = [];

    for (const scenario of scenarios) {
      try {
        const scenarioResult = await this.runScenario(scenario);
        results.push({ scenarioId: scenario.id, result: scenarioResult });
      } catch (error) {
        results.push({ scenarioId: scenario.id, error: error.message });
      }
    }

    return results;
  },
};

module.exports = ReplayRunner;
