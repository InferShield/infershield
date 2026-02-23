const { performance } = require('node:perf_hooks');

const PerformanceHarness = {
  async measurePerformance(batchRunner) {
    const startMemory = process.memoryUsage().heapUsed;
    const startTime = performance.now();

    await batchRunner();

    const endTime = performance.now();
    const endMemory = process.memoryUsage().heapUsed;

    return {
      latency: endTime - startTime,
      memoryUsed: endMemory - startMemory,
    };
  },

  compareWithBaseline(currentMetrics, baseline) {
    const regression = {
      latencyDelta: ((currentMetrics.latency - baseline.latency) / baseline.latency) * 100,
      memoryDelta: ((currentMetrics.memoryUsed - baseline.memoryUsed) / baseline.memoryUsed) * 100,
    };
    return regression;
  },
};

module.exports = PerformanceHarness;
