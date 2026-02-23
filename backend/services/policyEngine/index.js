const SingleRequestPolicy = require('./policies/SingleRequestPolicy');
const CrossStepEscalationPolicy = require('./policies/CrossStepEscalationPolicy');

class PolicyEngine {
  constructor() {
    this.policies = [
      new SingleRequestPolicy(),
      new CrossStepEscalationPolicy()
    ];
  }

  async evaluate(request, context) {
    let allow = true;
    let riskScore = 0;
    const violations = [];
    const reasons = [];

    for (const policy of this.policies) {
      const result = await policy.evaluate(request, context);
      if (!result.allow) {
        allow = false;
      }
      riskScore = Math.max(riskScore, result.riskScore);
      violations.push(...result.violations);
      if (result.reason) {
        reasons.push(result.reason);
      }
    }

    return {
      allow,
      riskScore,
      violations,
      reason: reasons.join('; ') || 'No policy violations'
    };
  }
}

module.exports = new PolicyEngine();