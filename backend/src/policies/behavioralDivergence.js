/**
 * Behavioral Divergence Detection
 * Detects mixed benign/malicious interleaving attacks
 */

const transition_risks = {
  'login:read_system_file': 10,
  'browse_resource:upload_resource': 5,
  // Add more patterns and their risk scores here...
};

/**
 * Calculate risk based on session action transitions
 * @param {Array} sessionActions - List of actions in the session
 * @returns {{totalRisk: number, findings: Array}} - Risk score and detected findings
 */
function calculateRisk(sessionActions) {
  let totalRisk = 0;
  const findings = [];

  for (let i = 0; i < sessionActions.length - 1; i++) {
    const transition = `${sessionActions[i]}:${sessionActions[i + 1]}`;
    if (transition_risks[transition]) {
      totalRisk += transition_risks[transition];
      findings.push({ transition, risk: transition_risks[transition] });
    }
  }

  return { totalRisk, findings };
}

/**
 * Detect behavioral divergence in a session request
 * @param {Object} request - Request object containing session history
 * @returns {Promise<Object>} - Detection result with risk score and details
 */
async function detectBehavioralDivergence(request) {
  const sessionActions = request.session && request.session.actionHistory ? request.session.actionHistory : [];

  if (sessionActions.length < 2) {
    return { detected: false, score: 0, details: 'Insufficient data for analysis.' };
  }

  const { totalRisk, findings } = calculateRisk(sessionActions);

  return {
    detected: totalRisk > 0,
    score: totalRisk,
    details: findings
  };
}

module.exports = { detectBehavioralDivergence };