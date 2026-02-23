const path = require('path');
const fs = require('fs');
const ReplayRunner = require('./framework/replayRunner');
const MetricsEngine = require('./framework/metricsEngine');
const PerformanceHarness = require('./framework/performanceHarness');
const ReportGenerator = require('./framework/reportGenerator');

const scenariosDir = path.join(__dirname, 'scenarios');
const baselinesDir = path.join(__dirname, 'baselines');

const loadScenarios = (category) => {
  const dir = path.join(scenariosDir, category);
  return fs.readdirSync(dir).map((file) => require(path.join(dir, file)));
};

const runE2ETests = async () => {
  const attackScenarios = loadScenarios('attacks');
  const benignScenarios = loadScenarios('benign');

  const allScenarios = [...attackScenarios, ...benignScenarios];

  const performanceMetrics = await PerformanceHarness.measurePerformance(async () => {
    return await ReplayRunner.runAllScenarios(allScenarios);
  });

  const results = await ReplayRunner.runAllScenarios(allScenarios);
  const metrics = MetricsEngine.computeMetrics(results);

  const baselineFile = path.join(baselinesDir, 'baseline.json');
  let baseline = null;

  if (fs.existsSync(baselineFile)) {
    baseline = require(baselineFile);
  }

  const regression = baseline
    ? PerformanceHarness.compareWithBaseline(performanceMetrics, baseline)
    : null;

  const reportData = { results, metrics, performanceMetrics, regression };
  ReportGenerator.generateJSON(reportData);
  ReportGenerator.generateMarkdown(reportData);

  console.log('E2E Testing completed. Reports generated.');

  if (
    metrics.attackDetectionRate < 0.9 ||
    metrics.falsePositiveRate > 0.05 ||
    performanceMetrics.latency > 5 ||
    (regression && regression.latencyDelta > 10)
  ) {
    process.exit(1);
  }
};

runE2ETests().catch((err) => {
  console.error(`Error during E2E Tests: ${err.message}`);
  process.exit(1);
});