const { detectBehavioralDivergence } = require('../policies/behavioralDivergence');

async function evaluateSessionRisk(session) {
  // Existing risk evaluation logic...

  // Behavioral divergence detection
  const divergenceResult = await detectBehavioralDivergence({ session });
  if (divergenceResult.detected) {
    session.riskScore += divergenceResult.score;
    session.findings.push({ source: 'behavioralDivergence', details: divergenceResult.details });
  }

  return session;
}

module.exports = { evaluateSessionRisk };