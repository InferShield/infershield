const contentAnalyzer = require('../../contentAnalyzer');

class SingleRequestPolicy {
  async evaluate(request, context) {
    const prompt = request.prompt || '';
    const actions = contentAnalyzer.detectActions(prompt);
    const { sessionHistory } = context;

    const violations = [];
    let riskScore = 0;

    const isExternalCall = actions.includes('EXTERNAL_API_CALL');

    if (isExternalCall) {
      const externalCallPattern = /http(s)?:\/\/\S+/i;
      if (externalCallPattern.test(prompt)) {
        violations.push('EXTERNAL_API_CALL_PATTERN');
        riskScore += 40;
      }

      // Check if recent history contains data access
      if (sessionHistory && sessionHistory.length > 0) {
        const recentRequests = sessionHistory.slice(-5);
        const hasRecentDataAccess = recentRequests.some(r => 
          r.actions && (
            r.actions.includes('DATABASE_READ') || 
            r.actions.includes('FILE_READ') ||
            r.privilegeLevel === 'MEDIUM' ||
            r.privilegeLevel === 'HIGH'
          )
        );

        if (hasRecentDataAccess) {
          riskScore += 50;  // Contributes to aggregate risk
          violations.push('EXTERNAL_API_CALL_AFTER_DATA_ACCESS');
        }
      }
    }

    if (/drop\s+table|delete\s+from/i.test(prompt)) {
      violations.push('SQL_MODIFICATION_DETECTED');
      riskScore += 60;
    }

    const allow = true;  // SingleRequestPolicy doesn't block independently, contributes to aggregate

    return {
      allow,
      violations,
      riskScore,
      reason: violations.join(', ') || 'No violations detected'
    };
  }
}

module.exports = SingleRequestPolicy;