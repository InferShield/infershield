const { parentPort, workerData } = require('worker_threads');
const db = require('../db/db');

/**
 * Worker thread for report generation
 * Runs in separate thread to avoid blocking main event loop
 */

async function generateReportData(job) {
  const { framework, startDate, endDate, userId } = job;

  try {
    // Fetch audit logs for the date range
    const result = await db.query(
      `SELECT 
        DATE(timestamp) as date,
        policy_type,
        severity,
        status,
        COUNT(*) as count,
        AVG(risk_score) as avg_risk_score,
        MAX(risk_score) as max_risk_score
       FROM audit_logs
       WHERE timestamp >= $1 
         AND timestamp < $2
         ${userId ? 'AND user_id = $3' : ''}
       GROUP BY DATE(timestamp), policy_type, severity, status
       ORDER BY date DESC, count DESC`,
      userId ? [startDate, endDate, userId] : [startDate, endDate]
    );

    // Aggregate statistics
    const stats = {
      totalEvents: 0,
      blockedEvents: 0,
      allowedEvents: 0,
      criticalEvents: 0,
      highRiskEvents: 0,
      mediumRiskEvents: 0,
      lowRiskEvents: 0,
      averageRiskScore: 0,
      maxRiskScore: 0,
      policyBreakdown: {},
      dailyStats: []
    };

    const dailyMap = new Map();

    result.rows.forEach(row => {
      const count = parseInt(row.count);
      stats.totalEvents += count;

      if (row.status === 'blocked') stats.blockedEvents += count;
      if (row.status === 'allowed') stats.allowedEvents += count;

      if (row.severity === 'critical') stats.criticalEvents += count;
      if (row.severity === 'high') stats.highRiskEvents += count;
      if (row.severity === 'medium') stats.mediumRiskEvents += count;
      if (row.severity === 'low') stats.lowRiskEvents += count;

      // Policy breakdown
      if (!stats.policyBreakdown[row.policy_type]) {
        stats.policyBreakdown[row.policy_type] = 0;
      }
      stats.policyBreakdown[row.policy_type] += count;

      // Daily stats
      const dateKey = row.date.toISOString().split('T')[0];
      if (!dailyMap.has(dateKey)) {
        dailyMap.set(dateKey, {
          date: dateKey,
          events: 0,
          blocked: 0,
          allowed: 0,
          avgRisk: 0,
          maxRisk: 0
        });
      }

      const daily = dailyMap.get(dateKey);
      daily.events += count;
      if (row.status === 'blocked') daily.blocked += count;
      if (row.status === 'allowed') daily.allowed += count;
      daily.avgRisk = Math.max(daily.avgRisk, parseFloat(row.avg_risk_score) || 0);
      daily.maxRisk = Math.max(daily.maxRisk, parseInt(row.max_risk_score) || 0);
    });

    stats.dailyStats = Array.from(dailyMap.values());
    stats.averageRiskScore = stats.totalEvents > 0
      ? stats.dailyStats.reduce((sum, d) => sum + d.avgRisk, 0) / stats.dailyStats.length
      : 0;
    stats.maxRiskScore = Math.max(...stats.dailyStats.map(d => d.maxRisk), 0);

    return {
      framework,
      startDate,
      endDate,
      generatedAt: new Date().toISOString(),
      stats,
      rawData: result.rows
    };
  } catch (error) {
    throw new Error(`Report generation failed: ${error.message}`);
  }
}

// Main worker execution
(async () => {
  try {
    const result = await generateReportData(workerData.job);
    parentPort.postMessage({ success: true, data: result });
  } catch (error) {
    parentPort.postMessage({ success: false, error: error.message });
  }
})();
