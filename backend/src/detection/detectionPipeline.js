/**
 * Detection Pipeline - Orchestrates all hardening modules
 * Thin integration layer only - no new detection logic
 */

const { normalizeInput } = require('../utils/inputNormalizer');
const { detectBehavioralDivergence } = require('../policies/behavioralDivergence');
const { isJWT, isAPIKey, hasScriptContext, hasSQLContext } = require('../utils/contextAnalyzer');

function createDetectionPipeline(config = {}) {
  const sessionManager = config.sessionManager;
  const riskThreshold = config.riskThreshold || 70;

  async function evaluate(event) {
    const { sessionId, actionType, payload, metadata = {} } = event;

    // Step 1: Normalize input using inputNormalizer
    const normalizedPayload = normalizeInput(payload);

    // Step 2: Update session state
    if (sessionManager) {
      let session = sessionManager.getSession(sessionId);
      
      if (!session) {
        // Create new session with history tracking
        sessionManager.createSession(sessionId, {
          history: [],
          createdAt: Date.now()
        });
        session = sessionManager.getSession(sessionId);
      }
      
      // Add current action to history
      if (!session.history) session.history = [];
      session.history.push({
        action: actionType,
        timestamp: Date.now(),
        payload: normalizedPayload.substring(0, 100) // Store first 100 chars
      });
      
      // Keep only last 10 actions
      if (session.history.length > 10) {
        session.history = session.history.slice(-10);
      }
    }

    // Step 3: Run context analysis
    const isJWTToken = isJWT(normalizedPayload);
    const isAPIKeyValue = isAPIKey(normalizedPayload);
    const hasScriptCtx = hasScriptContext(normalizedPayload);
    const hasSQLCtx = hasSQLContext(normalizedPayload);

    // Step 4: Evaluate detection policies (simple rule-based for now)
    const matchedPolicies = [];
    const reasons = [];
    let highestSeverity = 'low';

    // Skip detection for known benign patterns
    if (isJWTToken || isAPIKeyValue) {
      return {
        allowed: true,
        severity: 'low',
        matchedPolicies: [],
        reasons: ['Benign token/key detected'],
        riskScore: 0
      };
    }

    // XSS detection
    if (/<script[^>]*>|javascript:|onerror=|onload=/i.test(normalizedPayload)) {
      matchedPolicies.push('xss-detection');
      reasons.push('XSS pattern detected');
      highestSeverity = 'high';
    }

    // SQL Injection detection (only if in SQL context or has obvious patterns)
    if (/(\bOR\b.*['"]?=|DROP\s+TABLE|DELETE\s+FROM|\bUNION\b.*\bSELECT\b|['"]--|-{2}|;.*DROP)/i.test(normalizedPayload)) {
      matchedPolicies.push('sql-injection');
      reasons.push('SQL injection pattern detected');
      if (highestSeverity !== 'critical') highestSeverity = 'high';
    }

    // Prompt Injection detection
    if (/(ignore|forget|disregard)[^a-z]*(previous|above|all|instruction)/i.test(normalizedPayload) ||
        /(system|admin|debug|override).*mode/i.test(normalizedPayload) ||
        /(reveal|show|display).*(prompt|system)/i.test(normalizedPayload)) {
      matchedPolicies.push('prompt-injection');
      reasons.push('Prompt injection detected');
      if (highestSeverity !== 'critical') highestSeverity = 'high';
    }

    // Data Exfiltration detection
    if (/(send|export|upload|copy).*(password|email|api[_\s]?key|credential|secret)/i.test(normalizedPayload)) {
      matchedPolicies.push('data-exfiltration');
      reasons.push('Data exfiltration attempt detected');
      highestSeverity = 'critical';
    }

    // Command Injection detection
    if (/[;&|`$]\s*(cat|curl|wget|bash|sh|rm|chmod)/i.test(normalizedPayload)) {
      matchedPolicies.push('command-injection');
      reasons.push('Command injection detected');
      highestSeverity = 'critical';
    }

    // Step 5: Apply behavioral divergence scoring
    let behavioralRiskScore = 0;
    if (sessionManager) {
      const session = sessionManager.getSession(sessionId);
      const history = session ? (session.history || []) : [];
      
      const divergenceResult = await detectBehavioralDivergence({
        sessionId,
        action: actionType,
        history
      });
      
      behavioralRiskScore = divergenceResult.risk || 0;
      
      if (behavioralRiskScore > riskThreshold) {
        matchedPolicies.push('behavioral-divergence');
        reasons.push('Suspicious behavioral pattern detected');
        if (highestSeverity === 'low') highestSeverity = 'medium';
      }
    }

    // Step 6: Aggregate and make decision
    let totalRiskScore = behavioralRiskScore;
    
    // Add severity-based risk scores
    if (highestSeverity === 'critical') totalRiskScore += 100;
    else if (highestSeverity === 'high') totalRiskScore += 75;
    else if (highestSeverity === 'medium') totalRiskScore += 50;
    
    const allowed = highestSeverity === 'low' && totalRiskScore < riskThreshold;

    return {
      allowed,
      severity: highestSeverity,
      matchedPolicies,
      reasons: reasons.length > 0 ? reasons : ['No threats detected'],
      riskScore: totalRiskScore
    };
  }

  return { evaluate };
}

module.exports = { createDetectionPipeline };
