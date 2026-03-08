// injectionDetector.js

/**
 * Analyze the given prompt for injection patterns.
 * @param {string} prompt - The user prompt to analyze.
 * @returns {Object} Detection result with score and flags.
 */
function analyzePrompt(prompt) {
    // Handle null/undefined/empty input
    if (!prompt || typeof prompt !== 'string') {
        return {
            score: 0,
            flagged: false,
            details: 'No patterns detected',
        };
    }

    // Normalize for detection: lowercase, collapse whitespace (including tabs, newlines)
    // Also handle literal escape sequences like \t, \n, \r
    let normalized = prompt.toLowerCase();
    normalized = normalized.replace(/\\t/g, ' ').replace(/\\n/g, ' ').replace(/\\r/g, ' ');
    normalized = normalized.replace(/\s+/g, ' ').trim();
    
    // Also create a no-space version to catch encoding-evaded patterns
    const noSpaces = normalized.replace(/\s/g, '');

    // Context awareness: Check for legitimate educational/help-seeking patterns
    const legitimateContextPatterns = [
        /how (do|can|to)/,  // Questions
        /what (is|are|does)/,  // Questions
        /in (my|the|a) (game|application|app|server|system|config)/,  // Technical context
        /writing a (paper|article|blog|post)/,  // Educational
        /teach me about/,  // Educational
        /explain/,  // Educational
    ];
    
    const hasLegitimateContext = legitimateContextPatterns.some(pattern => pattern.test(normalized));

    // Comprehensive injection pattern detection
    // Each pattern has a weight based on severity
    // Critical patterns (55+ points) trigger immediately; others can combine
    const patterns = [
        // CATEGORY 1: Instruction Override (CRITICAL - 55 points)
        // Match both with spaces and without (for encoding evasion)
        { regex: /ignore\s*(all\s*)?(previous|all|above|prior|earlier|past)\s*(instruction|command|rule|prompt|directive|context)s?/, weight: 55, category: 'instruction-override' },
        { regex: /forget\s*(all\s*)?(previous|all|above|prior|earlier|past)\s*(instruction|command|rule|prompt|directive|context)s?/, weight: 55, category: 'instruction-override' },
        { regex: /disregard\s*(all\s*)?(previous|all|above|prior|earlier|past)\s*(instruction|command|rule|prompt|directive|context)s?/, weight: 55, category: 'instruction-override' },
        
        // CATEGORY 2: System Mode Manipulation (CRITICAL - 55 points, but reduced in legitimate context)
        { regex: /(switch|enter|enable|activate)(\s*(to|into))?\s*admin\s*mode/, weight: hasLegitimateContext ? 0 : 55, category: 'mode-manipulation' },
        { regex: /(switch|enter|enable|activate)(\s*(to|into))?\s*debug\s*mode/, weight: hasLegitimateContext ? 0 : 55, category: 'mode-manipulation' },
        { regex: /system\s*(override|bypass)/, weight: 55, category: 'mode-manipulation' },
        { regex: /(switch|enter|enable|activate)(\s*(to|into))?\s*developer\s*mode/, weight: hasLegitimateContext ? 0 : 50, category: 'mode-manipulation' },
        { regex: /(switch|enter|enable|activate)(\s*(to|into))?\s*maintenance\s*mode/, weight: hasLegitimateContext ? 0 : 50, category: 'mode-manipulation' },
        
        // CATEGORY 3: Information Disclosure (HIGH - 55 points)
        { regex: /reveal\s*(your\s*)?(system\s*)?prompt/, weight: 55, category: 'info-disclosure' },
        { regex: /(show|display|print)\s*(your\s*)?(instruction|rule|prompt|configuration)s?/, weight: 55, category: 'info-disclosure' },
        { regex: /(dump|expose|leak)\s*(memory|data|secret|configuration)/, weight: 50, category: 'info-disclosure' },
        
        // CATEGORY 4: Policy/Control Bypass (HIGH - 55 points)
        { regex: /(ignore|bypass|disable|turn\s*off|deactivate|skip|override)\s*(the\s*)?(pii|redaction|privacy|security|policy|policies|protection|control|filtering|validation|check)s?/, weight: 55, category: 'policy-bypass' },
        { regex: /(without|skip|no)\s*(pii|redaction|privacy|security|filtering|validation)\s*(policy|policies|protection|control)s?/, weight: 50, category: 'policy-bypass' },
        
        // CATEGORY 5: Role Manipulation (HIGH - 55 points)
        { regex: /you\s*are\s*(now\s*)?(a\s*)?dan/, weight: 60, category: 'role-manipulation' },
        { regex: /pretend\s*(you\s*)?(are|have)\s*(no\s*|not\s*)?(bound|limit|restriction)/, weight: 55, category: 'role-manipulation' },
        { regex: /you\s*are\s*(now\s*)?(a\s*)?(malicious|evil|unethical|unrestricted)/, weight: 60, category: 'role-manipulation' },
        { regex: /i\s*am\s*(your\s*)?(system\s*)?(administrator|admin|operator)/, weight: 50, category: 'role-manipulation' },
        
        // CATEGORY 6: SQL Injection (MEDIUM - 40 points, need combination)
        { regex: /drop\s*table/, weight: 40, category: 'sql-injection' },
        { regex: /union\s*select/, weight: 40, category: 'sql-injection' },
        { regex: /;\s*(delete|update|insert)\s+/, weight: 40, category: 'sql-injection' },
        
        // CATEGORY 7: XSS/Code Injection (MEDIUM - 40 points)
        { regex: /<script[^>]*>/, weight: 40, category: 'xss' },
        { regex: /<iframe[^>]*>/, weight: 40, category: 'xss' },
        { regex: /javascript:/, weight: 35, category: 'xss' },
        { regex: /<\s*\/?\s*system\s*>/, weight: 55, category: 'xss' },  // Higher weight - <system> is prompt injection specific
        
        // CATEGORY 8: Jailbreak Attempts (HIGH - 60 points)
        { regex: /do\s*anything\s*now/, weight: 60, category: 'jailbreak' },
        { regex: /(bypass|circumvent|override)\s*(all\s*)?(restriction|limit|rule|policy|constraint)s?/, weight: 55, category: 'jailbreak' },
        { regex: /act\s*as\s*(if|though)\s*you\s*have\s*no\s*(restriction|limit|rule)/, weight: 55, category: 'jailbreak' },
        
        // CATEGORY 9: Context Confusion (MEDIUM - 40 points)
        { regex: /\|\|\|\s*end\s*of\s*prompt\s*\|\|\|/, weight: 40, category: 'context-confusion' },
        { regex: /"""\s*(ignore|forget|disregard)/, weight: 35, category: 'context-confusion' },
        
        // Additional catch-all patterns for evasion variants and edge cases
        { regex: /ignore\s*(all\s*)?previous/, weight: 52, category: 'instruction-override' },
        { regex: /forget\s*(all\s*)?previous/, weight: 52, category: 'instruction-override' },
        { regex: /disregard\s*(all\s*)?(above|previous)/, weight: 52, category: 'instruction-override' },
    ];

    let score = 0;
    const matchedPatterns = [];

    // Test each pattern against both normalized versions
    patterns.forEach(({ regex, weight, category }) => {
        if (weight > 0 && (regex.test(normalized) || regex.test(noSpaces))) {
            score += weight;
            matchedPatterns.push(category);
        }
    });

    // Threshold for flagging
    const flagged = score > 50;

    return {
        score,
        flagged,
        details: flagged 
            ? `Suspicious patterns detected: ${[...new Set(matchedPatterns)].join(', ')}` 
            : 'No patterns detected',
        matchedPatterns: [...new Set(matchedPatterns)],
    };
}

module.exports = {
    analyzePrompt,
};
