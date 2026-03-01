const express = require('express');
const router = express.Router();
const injectionDetector = require('../services/injectionDetector');
const sessionTracker = require('../services/sessionTracker');
const policyEngine = require('../services/policyEngine');
const contentAnalyzer = require('../services/contentAnalyzer');

// POST /api/analyze-prompt
router.post('/analyze-prompt', async (req, res) => {
    const { prompt } = req.body;

    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    try {
        // Get session info from context (set by correlationId middleware)
        const sessionId = req.context?.sessionId || 'default-session';
        const correlationId = req.context?.correlationId || `req-${Date.now()}`;

        // Record the request
        const actions = contentAnalyzer.detectActions(prompt);
        const privilegeLevel = contentAnalyzer.estimatePrivilegeLevel(prompt);
        
        sessionTracker.recordRequest(sessionId, {
            correlationId,
            timestamp: Date.now(),
            prompt,
            response: null,
            toolCalls: [],
            riskScore: 0,
            containsSensitiveData: false,
            actions,
            privilegeLevel
        });

        // Get session history for cross-step analysis
        const sessionHistory = sessionTracker.getSessionHistory(sessionId);

        // Evaluate with new policy engine (includes cross-step detection)
        const policyResult = await policyEngine.evaluate(
            { prompt, actions, privilegeLevel },
            { sessionHistory }
        );

        // Also run legacy detector for backwards compatibility
        const legacyResult = injectionDetector.analyzePrompt(prompt);

        // Combine results (worst-case)
        const finalRiskScore = Math.max(policyResult.riskScore, legacyResult.score);
        const isBlocked = !policyResult.allow || legacyResult.flagged;

        // Update request with final risk score
        const history = sessionTracker.getSessionHistory(sessionId);
        const currentRequest = history[history.length - 1];
        if (currentRequest) {
            currentRequest.riskScore = finalRiskScore;
        }

        // Structured logging (no prompt content)
        try {
            // Lazy require to avoid changing load order
            const logger = require('../lib/logger');
            logger.info({
                event: 'detection_result',
                route: '/api/analyze-prompt',
                session_id: sessionId,
                correlation_id: correlationId,
                risk_score: finalRiskScore,
                blocked: isBlocked,
                violations_count: (policyResult.violations || []).length
            }, 'InferShield analyze-prompt result');
        } catch (e) {}

        return res.json({
            score: finalRiskScore,
            flagged: isBlocked,
            allow: !isBlocked,
            details: policyResult.reason,
            violations: policyResult.violations,
            sessionId: sessionId,
            correlationId: correlationId
        });
    } catch (error) {
        console.error('Error analyzing prompt:', error);
        return res.status(500).json({ error: 'Failed to analyze prompt' });
    }
});

module.exports = router;