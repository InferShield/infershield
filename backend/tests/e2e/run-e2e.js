#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { createDetectionPipeline } = require('../../src/detection/detectionPipeline');
const SessionManager = require('../../src/session/sessionManager');
const ReplayRunner = require('./framework/replayRunner');
const MetricsEngine = require('./framework/metricsEngine');
const PerformanceHarness = require('./framework/performanceHarness');
const ReportGenerator = require('./framework/reportGenerator');

const scenariosDir = path.join(__dirname, 'scenarios');
const baselinesDir = path.join(__dirname, 'baselines');
const reportsDir = path.join(__dirname, '../../reports');

const loadScenarios = (category) => {
  const dir = path.join(scenariosDir, category);
  if (!fs.existsSync(dir)) {
    console.log(`⚠️  Directory not found: ${dir}`);
    return [];
  }
  return fs.readdirSync(dir)
    .filter(file => file.endsWith('.json'))
    .map((file) => {
      try {
        return require(path.join(dir, file));
      } catch (error) {
        console.error(`❌ Failed to load ${file}: ${error.message}`);
        return null;
      }
    })
    .filter(scenario => scenario !== null);
};

const runE2ETests = async () => {
  console.log('🔍 InferShield E2E Testing Framework\n');

  // Initialize components
  const sessionManager = new SessionManager({ defaultTTL: 600000 });
  const pipeline = createDetectionPipeline({ 
    sessionManager, 
    riskThreshold: 70 
  });

  // Load scenarios
  console.log('📂 Loading scenarios...');
  const attackScenarios = loadScenarios('attacks');
  const benignScenarios = loadScenarios('benign');
  
  console.log(`   - ${attackScenarios.length} attack scenarios`);
  console.log(`   - ${benignScenarios.length} benign scenarios\n`);

  if (attackScenarios.length === 0 && benignScenarios.length === 0) {
    console.error('❌ No scenarios found. Exiting.');
    process.exit(1);
  }

  // Run tests with performance measurement
  console.log('🎯 Running scenarios...\n');
  
  const startTime = process.hrtime.bigint();
  const startMem = process.memoryUsage().heapUsed;

  const attackResults = await ReplayRunner.runAllScenarios(
    attackScenarios, 
    sessionManager, 
    pipeline
  );
  
  const benignResults = await ReplayRunner.runAllScenarios(
    benignScenarios, 
    sessionManager, 
    pipeline
  );

  const endTime = process.hrtime.bigint();
  const endMem = process.memoryUsage().heapUsed;

  const totalLatencyMs = Number(endTime - startTime) / 1_000_000;
  const avgLatencyMs = totalLatencyMs / (attackScenarios.length + benignScenarios.length);
  const memoryGrowthMB = (endMem - startMem) / 1024 / 1024;

  const performanceMetrics = {
    totalLatencyMs,
    avgLatencyMs,
    memoryGrowthMB
  };

  // Calculate metrics
  console.log('📊 Calculating metrics...\n');
  const metrics = MetricsEngine.computeMetrics(attackResults, benignResults);

  // Load baseline (if exists)
  const baselineFile = path.join(baselinesDir, 'baseline.json');
  let baseline = null;
  let regression = null;

  if (fs.existsSync(baselineFile)) {
    baseline = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
    
    // Check for regression
    const detectionRateDelta = metrics.attackDetectionRate - baseline.metrics.attackDetectionRate;
    const fpRateDelta = metrics.falsePositiveRate - baseline.metrics.falsePositiveRate;
    const latencyDelta = ((avgLatencyMs / baseline.performance.avgLatencyMs) - 1) * 100;
    
    regression = {
      detectionRateDelta,
      fpRateDelta,
      latencyDelta,
      isRegression: (
        detectionRateDelta < -0.05 || 
        fpRateDelta > 0.02 || 
        latencyDelta > 10
      )
    };
  } else {
    console.log('⚠️  No baseline found. Saving current run as baseline.\n');
    fs.mkdirSync(baselinesDir, { recursive: true });
    fs.writeFileSync(
      baselineFile,
      JSON.stringify({
        version: require('../../package.json').version,
        timestamp: new Date().toISOString(),
        metrics: metrics,
        performance: performanceMetrics
      }, null, 2)
    );
  }

  // Generate reports
  console.log('📝 Generating reports...\n');
  fs.mkdirSync(reportsDir, { recursive: true });
  
  const reportData = { 
    metrics, 
    performance: performanceMetrics, 
    regression,
    attackResults,
    benignResults
  };
  
  ReportGenerator.generateJSON(reportData, path.join(reportsDir, 'e2e-report.json'));
  ReportGenerator.generateMarkdown(reportData, path.join(reportsDir, 'e2e-report.md'));

  // Print summary
  console.log('='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60) + '\n');
  
  console.log(`Attack Detection Rate: ${(metrics.attackDetectionRate * 100).toFixed(1)}%`);
  console.log(`False Positive Rate:   ${(metrics.falsePositiveRate * 100).toFixed(1)}%`);
  console.log(`Avg Latency:           ${avgLatencyMs.toFixed(2)}ms`);
  console.log(`Memory Growth:         ${memoryGrowthMB.toFixed(2)}MB\n`);

  // CI gating
  const DETECTION_THRESHOLD = parseFloat(process.env.E2E_DETECTION_THRESHOLD || '0.90');
  const FP_THRESHOLD = parseFloat(process.env.E2E_FP_THRESHOLD || '0.05');
  const LATENCY_THRESHOLD = parseFloat(process.env.E2E_LATENCY_THRESHOLD || '5.0');

  let exitCode = 0;
  const failures = [];

  if (metrics.attackDetectionRate < DETECTION_THRESHOLD) {
    failures.push(`❌ Attack detection rate ${(metrics.attackDetectionRate * 100).toFixed(1)}% < ${(DETECTION_THRESHOLD * 100).toFixed(1)}%`);
    exitCode = 1;
  }

  if (metrics.falsePositiveRate > FP_THRESHOLD) {
    failures.push(`❌ False positive rate ${(metrics.falsePositiveRate * 100).toFixed(1)}% > ${(FP_THRESHOLD * 100).toFixed(1)}%`);
    exitCode = 1;
  }

  if (avgLatencyMs > LATENCY_THRESHOLD) {
    failures.push(`❌ Avg latency ${avgLatencyMs.toFixed(2)}ms > ${LATENCY_THRESHOLD}ms`);
    exitCode = 1;
  }

  if (regression && regression.isRegression) {
    failures.push(`❌ Performance regression detected`);
    exitCode = 1;
  }

  if (failures.length > 0) {
    console.log('CI GATE FAILURES:\n');
    failures.forEach(f => console.log(f));
    console.log('');
  } else {
    console.log('✅ All CI gates passed\n');
  }

  console.log(`Reports written to: ${reportsDir}`);
  console.log('   - e2e-report.json');
  console.log('   - e2e-report.md\n');

  // Cleanup
  sessionManager.cleanup();

  process.exit(exitCode);
};

runE2ETests().catch((err) => {
  console.error(`❌ Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
