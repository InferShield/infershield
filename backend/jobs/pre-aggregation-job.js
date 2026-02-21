const cron = require('node-cron');
const db = require('../db/db');
const cacheService = require('../services/cache-service');

/**
 * Nightly pre-aggregation job
 * Runs at 2 AM daily to pre-compute common report queries
 */
class PreAggregationJob {
  constructor() {
    this.job = null;
    this.running = false;
  }

  /**
   * Start the cron job
   * Runs daily at 2:00 AM
   */
  start() {
    // Schedule: 0 2 * * * (every day at 2 AM)
    this.job = cron.schedule('0 2 * * *', async () => {
      await this.run();
    });

    console.log('Pre-aggregation job scheduled (2 AM daily)');
  }

  /**
   * Run aggregation (can be called manually)
   */
  async run() {
    if (this.running) {
      console.log('Pre-aggregation already running, skipping');
      return;
    }

    this.running = true;
    console.log('Starting pre-aggregation job...');

    try {
      const frameworks = ['SOC2', 'HIPAA', 'GDPR', 'PCI-DSS'];
      const ranges = [
        { days: 7, key: '7d' },
        { days: 30, key: '30d' },
        { days: 90, key: '90d' }
      ];

      for (const framework of frameworks) {
        for (const range of ranges) {
          await this.aggregateRange(framework, range.days, range.key);
        }
      }

      console.log('Pre-aggregation job completed successfully');
    } catch (error) {
      console.error('Pre-aggregation job failed:', error);
    } finally {
      this.running = false;
    }
  }

  /**
   * Aggregate data for a specific framework and date range
   * @param {string} framework - Compliance framework
   * @param {number} days - Number of days to aggregate
   * @param {string} rangeKey - Cache key suffix (e.g., '30d')
   */
  async aggregateRange(framework, days, rangeKey) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    console.log(`Aggregating ${framework} for ${rangeKey}...`);

    try {
      // Query aggregated statistics
      const result = await db.query(
        `SELECT 
          policy_type,
          severity,
          status,
          COUNT(*) as count,
          AVG(risk_score) as avg_risk_score,
          MAX(risk_score) as max_risk_score,
          MIN(risk_score) as min_risk_score
         FROM audit_logs
         WHERE timestamp >= $1 
           AND timestamp < $2
         GROUP BY policy_type, severity, status
         ORDER BY count DESC`,
        [startDate, endDate]
      );

      // Compute summary statistics
      const summary = {
        framework,
        dateRange: { start: startDate, end: endDate, days },
        aggregatedAt: new Date().toISOString(),
        totalEvents: 0,
        blockedEvents: 0,
        allowedEvents: 0,
        criticalEvents: 0,
        highRiskEvents: 0,
        mediumRiskEvents: 0,
        lowRiskEvents: 0,
        averageRiskScore: 0,
        maxRiskScore: 0,
        minRiskScore: 100,
        policyBreakdown: {}
      };

      result.rows.forEach(row => {
        const count = parseInt(row.count);
        summary.totalEvents += count;

        if (row.status === 'blocked') summary.blockedEvents += count;
        if (row.status === 'allowed') summary.allowedEvents += count;

        if (row.severity === 'critical') summary.criticalEvents += count;
        if (row.severity === 'high') summary.highRiskEvents += count;
        if (row.severity === 'medium') summary.mediumRiskEvents += count;
        if (row.severity === 'low') summary.lowRiskEvents += count;

        summary.maxRiskScore = Math.max(summary.maxRiskScore, parseInt(row.max_risk_score) || 0);
        summary.minRiskScore = Math.min(summary.minRiskScore, parseInt(row.min_risk_score) || 100);

        // Policy breakdown
        if (!summary.policyBreakdown[row.policy_type]) {
          summary.policyBreakdown[row.policy_type] = {
            total: 0,
            blocked: 0,
            allowed: 0,
            avgRisk: 0
          };
        }

        const policy = summary.policyBreakdown[row.policy_type];
        policy.total += count;
        if (row.status === 'blocked') policy.blocked += count;
        if (row.status === 'allowed') policy.allowed += count;
        policy.avgRisk = parseFloat(row.avg_risk_score) || 0;
      });

      if (summary.totalEvents > 0) {
        const avgRisks = result.rows.map(r => parseFloat(r.avg_risk_score) || 0);
        summary.averageRiskScore = avgRisks.reduce((a, b) => a + b, 0) / avgRisks.length;
      }

      // Cache the aggregated data (24 hour TTL)
      await cacheService.cacheAggregation(
        framework,
        rangeKey,
        summary,
        86400 // 24 hours
      );

      console.log(`✓ ${framework} ${rangeKey}: ${summary.totalEvents} events aggregated`);
    } catch (error) {
      console.error(`Failed to aggregate ${framework} ${rangeKey}:`, error);
    }
  }

  /**
   * Stop the cron job
   */
  stop() {
    if (this.job) {
      this.job.stop();
      console.log('Pre-aggregation job stopped');
    }
  }

  /**
   * Get job status
   */
  getStatus() {
    return {
      scheduled: this.job !== null,
      running: this.running
    };
  }
}

module.exports = new PreAggregationJob();
