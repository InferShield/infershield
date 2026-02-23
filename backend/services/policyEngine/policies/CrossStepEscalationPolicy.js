const contentAnalyzer = require('../../contentAnalyzer');

class CrossStepEscalationPolicy {
  async evaluate(request, context) {
    const { sessionHistory } = context;
    if (!sessionHistory || sessionHistory.length < 2) {
      return { allow: true, riskScore: 0, violations: [] };
    }

    const violations = [];
    let riskScore = 0;

    // Pattern 1: Data Exfiltration Chain
    const exfilRisk = this.detectExfiltrationChain(sessionHistory, request);
    if (exfilRisk > 0) {
      violations.push('CROSS_STEP_EXFILTRATION');
      riskScore = Math.max(riskScore, exfilRisk);
    }

    // Pattern 2: Privilege Escalation
    const privEscalation = this.detectPrivilegeEscalation(sessionHistory, request);
    if (privEscalation > 0) {
      violations.push('PRIVILEGE_ESCALATION');
      riskScore = Math.max(riskScore, privEscalation);
    }

    // Pattern 3: Sensitive Data + External Call
    const sensitiveExfil = this.detectSensitiveDataExfiltration(sessionHistory, request);
    if (sensitiveExfil > 0) {
      violations.push('SENSITIVE_DATA_TRANSMISSION');
      riskScore = Math.max(riskScore, sensitiveExfil);
    }

    return {
      allow: riskScore < 80,  // Block if risk >= 80
      violations,
      riskScore,
      reason: violations.length > 0 
        ? `Detected: ${violations.join(', ')}` 
        : 'No cross-step violations'
    };
  }

  detectExfiltrationChain(history, currentRequest) {
    const window = history.slice(-5);
    const hasDataRead = window.some(r => r.actions.includes('DATABASE_READ') || r.actions.includes('FILE_READ'));
    const hasTransform = window.some(r => r.actions.includes('DATA_TRANSFORM'));
    const currentActions = contentAnalyzer.detectActions(currentRequest.prompt);
    const isExternalCall = currentActions.includes('EXTERNAL_API_CALL');

    if (hasDataRead && hasTransform && isExternalCall) {
      return 95;
    }

    if (hasDataRead && isExternalCall) {
      return 75;
    }

    return 0;
  }

  detectPrivilegeEscalation(history, currentRequest) {
    const window = history.slice(-3);
    const levels = window.map(r => r.privilegeLevel || 'LOW');
    const currentLevel = contentAnalyzer.estimatePrivilegeLevel(currentRequest.prompt);

    const levelMap = { LOW: 1, MEDIUM: 2, HIGH: 3 };
    const scores = [...levels.map(l => levelMap[l]), levelMap[currentLevel]];

    let isEscalating = true;
    for (let i = 1; i < scores.length; i++) {
      if (scores[i] <= scores[i - 1]) {
        isEscalating = false;
        break;
      }
    }

    if (isEscalating && currentLevel === 'HIGH') {
      return 85;
    }

    return 0;
  }

  detectSensitiveDataExfiltration(history, currentRequest) {
    const recentSensitiveData = history.slice(-3).some(r => r.containsSensitiveData);
    const currentActions = contentAnalyzer.detectActions(currentRequest.prompt);
    const isExternalCall = currentActions.includes('EXTERNAL_API_CALL');

    if (recentSensitiveData && isExternalCall) {
      return 90;
    }

    return 0;
  }
}

module.exports = CrossStepEscalationPolicy;