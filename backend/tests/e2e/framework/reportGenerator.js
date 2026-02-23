const fs = require('fs');
const path = require('path');

const reportDir = path.join(__dirname, '../../reports');

const ReportGenerator = {
  generateJSON(reportData, filename = 'e2e-report.json') {
    const filePath = path.join(reportDir, filename);
    fs.writeFileSync(filePath, JSON.stringify(reportData, null, 2));
  },

  generateMarkdown(reportData, filename = 'e2e-report.md') {
    const filePath = path.join(reportDir, filename);

    const markdown = `# End-to-End Test Report\n\n` +
      `## Metrics\n` +
      `- **Attack Detection Rate:** ${reportData.metrics.attackDetectionRate.toFixed(2)}\n` +
      `- **False Positive Rate:** ${reportData.metrics.falsePositiveRate.toFixed(2)}\n\n` +
      `## Detailed Stats\n` +
      `- True Positives: ${reportData.metrics.stats.TP}\n` +
      `- False Positives: ${reportData.metrics.stats.FP}\n` +
      `- True Negatives: ${reportData.metrics.stats.TN}\n` +
      `- False Negatives: ${reportData.metrics.stats.FN}\n\n`;

    fs.writeFileSync(filePath, markdown);
  },
};

module.exports = ReportGenerator;
