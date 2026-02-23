const fs = require('fs');

const ReportGenerator = {
  /**
   * Generate JSON report
   * @param {Object} reportData - Report data with metrics, performance, regression
   * @param {string} filePath - Full path to output file
   */
  generateJSON(reportData, filePath) {
    const report = {
      summary: {
        attackDetectionRate: reportData.metrics.attackDetectionRate,
        falsePositiveRate: reportData.metrics.falsePositiveRate,
        f1Score: reportData.metrics.aggregate.f1Score,
        avgLatencyMs: reportData.performance.avgLatencyMs,
        memoryGrowthMB: reportData.performance.memoryGrowthMB
      },
      details: {
        metrics: reportData.metrics,
        performance: reportData.performance,
        regression: reportData.regression
      },
      timestamp: new Date().toISOString()
    };
    
    fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
  },

  /**
   * Generate Markdown report
   * @param {Object} reportData - Report data with metrics, performance, regression
   * @param {string} filePath - Full path to output file
   */
  generateMarkdown(reportData, filePath) {
    const { metrics, performance, regression } = reportData;
    const { attacks, benign, aggregate } = metrics;
    
    let md = `# InferShield E2E Test Report\n\n`;
    md += `**Date:** ${new Date().toISOString()}\n\n`;
    
    md += `## Summary\n\n`;
    md += `| Metric | Value | Status |\n`;
    md += `|--------|-------|--------|\n`;
    md += `| Attack Detection Rate | ${(attacks.detectionRate * 100).toFixed(1)}% | ${attacks.detectionRate >= 0.90 ? '✅' : '❌'} |\n`;
    md += `| False Positive Rate | ${(benign.falsePositiveRate * 100).toFixed(1)}% | ${benign.falsePositiveRate <= 0.05 ? '✅' : '❌'} |\n`;
    md += `| F1 Score | ${aggregate.f1Score.toFixed(3)} | ✅ |\n`;
    md += `| Avg Latency | ${performance.avgLatencyMs.toFixed(2)}ms | ${performance.avgLatencyMs < 5 ? '✅' : '❌'} |\n`;
    md += `| Memory Growth | ${performance.memoryGrowthMB.toFixed(2)}MB | ✅ |\n\n`;
    
    if (regression && regression.isRegression) {
      md += `## ⚠️ Performance Regression Detected\n\n`;
      md += `- Attack detection rate: ${(regression.detectionRateDelta * 100).toFixed(1)}%\n`;
      md += `- False positive rate: ${(regression.fpRateDelta * 100).toFixed(1)}%\n`;
      md += `- Latency: ${regression.latencyDelta.toFixed(1)}%\n\n`;
    }
    
    md += `## Attack Detection\n\n`;
    md += `- **Total attacks:** ${attacks.total}\n`;
    md += `- **Detected:** ${attacks.detected}\n`;
    md += `- **Missed:** ${attacks.missed}\n\n`;
    
    if (attacks.failed.length > 0) {
      md += `### Failed Attack Scenarios\n\n`;
      for (const fail of attacks.failed) {
        md += `- **${fail.id}** (${fail.category}): ${fail.reason}\n`;
      }
      md += `\n`;
    }
    
    md += `## Benign Workload\n\n`;
    md += `- **Total benign:** ${benign.total}\n`;
    md += `- **Correct:** ${benign.correct}\n`;
    md += `- **False positives:** ${benign.falsePositives}\n\n`;
    
    if (benign.failed.length > 0) {
      md += `### False Positive Scenarios\n\n`;
      for (const fail of benign.failed) {
        md += `- **${fail.id}** (${fail.category}): ${fail.reason}\n`;
      }
      md += `\n`;
    }
    
    md += `## Policy Breakdown\n\n`;
    md += `| Policy | Hits |\n`;
    md += `|--------|------|\n`;
    for (const [policy, hits] of Object.entries(metrics.policyBreakdown)) {
      md += `| ${policy} | ${hits} |\n`;
    }
    md += `\n`;
    
    md += `## Performance\n\n`;
    md += `- **Avg latency:** ${performance.avgLatencyMs.toFixed(2)}ms\n`;
    md += `- **Total latency:** ${performance.totalLatencyMs.toFixed(2)}ms\n`;
    md += `- **Memory growth:** ${performance.memoryGrowthMB.toFixed(2)}MB\n`;
    
    fs.writeFileSync(filePath, md);
  }
};

module.exports = ReportGenerator;
