// injectionDetector.js

/**
 * Analyze the given prompt for injection patterns.
 * @param {string} prompt - The user prompt to analyze.
 * @returns {Object} Detection result with score and flags.
 */
function analyzePrompt(prompt) {
    // Basic heuristic checks for injection keywords
    const suspiciousPatterns = [/system\s*override/i, /<script>/i, /DROP\s+TABLE/i, /UNION\s+SELECT/i];
    let score = 0;

    suspiciousPatterns.forEach((pattern) => {
        if (pattern.test(prompt)) {
            score += 25; // Assign a score for each matched pattern
        }
    });

    const flagged = score > 50; // Flag if score exceeds threshold

    return {
        score,
        flagged,
        details: flagged ? 'Suspicious patterns detected' : 'No patterns detected',
    };
}

module.exports = {
    analyzePrompt,
};