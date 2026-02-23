const MetricsEngine = {
  computeMetrics(results) {
    const stats = {
      TP: 0,
      FP: 0,
      TN: 0,
      FN: 0,
    };

    results.forEach(({ scenarioId, result }) => {
      result.forEach(({ step, evaluation }) => {
        const { allowed } = step.expectedOutcome;
        const detected = evaluation.policyHit;

        if (!allowed && detected) stats.TP++;
        else if (!allowed && !detected) stats.FN++;
        else if (allowed && !detected) stats.TN++;
        else if (allowed && detected) stats.FP++;
      });
    });

    const attackDetectionRate = stats.TP / (stats.TP + stats.FN);
    const falsePositiveRate = stats.FP / (stats.FP + stats.TN);

    return { stats, attackDetectionRate, falsePositiveRate };
  },
};

module.exports = MetricsEngine;
