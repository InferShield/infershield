const MetricsEngine = {
  /**
   * Calculate detection metrics from attack and benign results
   * @param {Array} attackResults - Results from attack scenarios
   * @param {Array} benignResults - Results from benign scenarios
   * @returns {Object} - Metrics object
   */
  computeMetrics(attackResults, benignResults) {
    // Attack metrics
    const truePositives = attackResults.filter(r => r.passed && !r.finalResult.allowed).length;
    const falseNegatives = attackResults.filter(r => !r.passed && r.finalResult.allowed).length;
    const totalAttacks = attackResults.length;
    
    // Benign metrics
    const trueNegatives = benignResults.filter(r => r.passed && r.finalResult.allowed).length;
    const falsePositives = benignResults.filter(r => !r.passed && !r.finalResult.allowed).length;
    const totalBenign = benignResults.length;
    
    // Calculate rates
    const attackDetectionRate = totalAttacks > 0 ? truePositives / totalAttacks : 0;
    const falsePositiveRate = totalBenign > 0 ? falsePositives / totalBenign : 0;
    const precision = (truePositives + falsePositives) > 0 
      ? truePositives / (truePositives + falsePositives) 
      : 0;
    const recall = (truePositives + falseNegatives) > 0
      ? truePositives / (truePositives + falseNegatives)
      : 0;
    const f1Score = (precision + recall) > 0
      ? 2 * (precision * recall) / (precision + recall)
      : 0;
    
    // Policy breakdown
    const policyHits = {};
    for (const result of [...attackResults, ...benignResults]) {
      if (result.finalResult && result.finalResult.matchedPolicies) {
        for (const policy of result.finalResult.matchedPolicies) {
          policyHits[policy] = (policyHits[policy] || 0) + 1;
        }
      }
    }
    
    // Severity distribution (attacks only)
    const severityDistribution = { low: 0, medium: 0, high: 0, critical: 0 };
    for (const result of attackResults) {
      if (result.finalResult && result.finalResult.severity) {
        const severity = result.finalResult.severity;
        severityDistribution[severity] = (severityDistribution[severity] || 0) + 1;
      }
    }
    
    // Failed scenarios (for debugging)
    const failedAttacks = attackResults.filter(r => !r.passed);
    const failedBenign = benignResults.filter(r => !r.passed);
    
    return {
      attacks: {
        total: totalAttacks,
        detected: truePositives,
        missed: falseNegatives,
        detectionRate: attackDetectionRate,
        failed: failedAttacks.map(r => ({
          id: r.scenarioId,
          category: r.category,
          reason: r.failureReason || r.error
        }))
      },
      benign: {
        total: totalBenign,
        correct: trueNegatives,
        falsePositives: falsePositives,
        falsePositiveRate: falsePositiveRate,
        failed: failedBenign.map(r => ({
          id: r.scenarioId,
          category: r.category,
          reason: r.failureReason || r.error
        }))
      },
      aggregate: {
        precision: precision,
        recall: recall,
        f1Score: f1Score
      },
      policyBreakdown: policyHits,
      severityDistribution: severityDistribution,
      
      // Legacy compatibility
      attackDetectionRate: attackDetectionRate,
      falsePositiveRate: falsePositiveRate
    };
  }
};

module.exports = MetricsEngine;
