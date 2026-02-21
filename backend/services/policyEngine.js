// policyEngine.js

/**
 * Evaluate policies against a given prompt.
 * @param {string} prompt - The user prompt to enforce policies on.
 * @param {Array} policies - List of policies to check.
 * @returns {Object} Enforcement result with allow/block decision.
 */
function enforcePolicies(prompt, policies) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return { allow: true, reason: 'No policies defined' };
    }

    for (const policy of policies) {
        try {
            const ruleRegex = new RegExp(policy.rule, 'i');
            if (ruleRegex.test(prompt)) {
                return { allow: false, reason: `Blocked by policy: ${policy.name}` };
            }
        } catch (e) {
            console.error(`Error evaluating policy ${policy.name}:`, e);
            return { allow: true, reason: 'Policy evaluation error' };
        }
    }

    return { allow: true, reason: 'No blocking policies matched' };
}

module.exports = {
    enforcePolicies,
};