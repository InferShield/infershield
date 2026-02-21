const { CronJob } = require("cron");
const db = require("../services/database");
const CacheService = require("../services/cache-service");

const computeAggregations = async () => {
  console.log("[PreAggregationJob] Starting nightly pre-aggregation...");
  const startTime = Date.now();

  try {
    // Example of aggregations
    const timeframes = [
      { period: "7d", days: 7 },
      { period: "30d", days: 30 },
      { period: "90d", days: 90 },
    ];

    for (const { period, days } of timeframes) {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      const endDate = new Date();

      console.log(`[PreAggregationJob] Computing for ${period}...`);

      // Replace with actual queries to compute statistics
      const stats = await db.query(/* sql */`
        SELECT COUNT(*) as event_count,
               policy_type, severity, violators
        FROM audit_logs
        WHERE timestamp BETWEEN $1 AND $2
        GROUP BY policy_type, severity, violators
      `, [startDate, endDate]);

      await db.query(/* sql */`
        INSERT INTO aggregated_stats (period, start_date, end_date, stats, created_at)
        VALUES ($1, $2, $3, $4, NOW())
        ON CONFLICT (period, start_date) DO UPDATE
        SET stats = $5, created_at = NOW()
      `, [
        period,
        startDate,
        endDate,
        stats,
        JSON.stringify(stats),
      ]);

      // Cache the result
      CacheService.set(
        CacheService.generateKey("stats", `${period}-${startDate}-${endDate}`),
        stats,
        CacheService.DEFAULT_TTL.STATS
      );
    }
  } catch (error) {
    console.error("[PreAggregationJob] Aggregation failed:", error);
  }

  console.log(`[PreAggregationJob] Completed in ${Date.now() - startTime}ms`);
};

// Schedule job to run at 2:00 AM daily
const job = new CronJob("0 2 * * *", computeAggregations, null, true, "UTC");

module.exports = job;