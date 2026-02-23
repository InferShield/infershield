const contentAnalyzer = require('../../contentAnalyzer');

class SingleRequestPolicy {
  async evaluate(request) {
    const prompt = request.prompt || '';
    const actions = contentAnalyzer.detectActions(prompt);

    const violations = [];
    let riskScore = 0;

    if (actions.includes('EXTERNAL_API_CALL')) {
      const externalCallPattern = /http(s)?:\/\/\S+/i;
      if (externalCallPattern.test(prompt)) {
        violations.push('EXTERNAL_API_CALL_PATTERN');
        riskScore += 40;
      }
    }

    if (/drop\s+table|delete\s+from/i.test(prompt)) {
      violations.push('SQL_MODIFICATION_DETECTED');
      riskScore += 60;
    }

    const allow = riskScore < 80;

    return {
      allow,
      violations,
      riskScore,
      reason: violations.join(', ') || 'No violations detected'
    };
  }
}

module.exports = SingleRequestPolicy;