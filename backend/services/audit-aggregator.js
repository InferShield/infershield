const db = require('../database/connection'); // Assuming knex instance
/** 
 * Query Builder for Audit Logs.
 * Supports filtering on date, severity, policy type, and user/role combinations.
 * 
 * SECURITY: All methods require userId parameter for tenant isolation.
 */
class AuditAggregator {

    /**
     * Filters audit logs based on the provided parameters.
     * 
     * @param {number} userId - User ID for tenant scoping (REQUIRED)
     * @param {Object} filters - Filtering criteria.
     * @param {Date} filters.start_date - Filter logs after this date.
     * @param {Date} filters.end_date - Filter logs before this date.
     * @param {string[]} filters.policy_types - List of policy types (prompt_injection, etc.).
     * @param {string[]} filters.severity_levels - Severity of the logs (low, medium, high, critical).
     * @param {string[]} filters.users - Specific users to filter by.
     * @param {string[]} filters.roles - Specific roles to filter by.
     * @returns 
     */
    async filterLogs(userId, { start_date, end_date, policy_types, severity_levels, users, roles }) {
        if (!userId) {
            throw new Error('[SECURITY] userId is required for audit log queries');
        }

        // TENANT-SCOPED: ensures user isolation
        const query = db('audit_logs').where('user_id', userId);
        
        // Apply date range filter
        if (start_date) query.where('created_at', '>=', start_date);
        if (end_date) query.where('created_at', '<=', end_date);
        
        // Filter policy types
        if (Array.isArray(policy_types) && policy_types.length > 0) {
            query.whereIn('policy_type', policy_types);
        }
        
        // Filter severity levels
        if (Array.isArray(severity_levels) && severity_levels.length > 0) {
            query.whereIn('severity', severity_levels);
        }

        // User or role filter
        if (Array.isArray(users) && users.length > 0) {
            query.whereIn('user', users);
        }

        if (Array.isArray(roles) && roles.length > 0) {
            query.whereIn('role', roles);
        }

        return query;
    }

    /**
     * Generates a summary of audit logs statistics.
     * 
     * @param {number} userId - User ID for tenant scoping (REQUIRED)
     * @param {Object} filters - Filtering criteria
     */
    async generateStatistics(userId, filters) {
        if (!userId) {
            throw new Error('[SECURITY] userId is required for audit statistics');
        }

        const filteredLogs = await this.filterLogs(userId, filters);

        // Compute total events grouped by policy type
        const totalByPolicy = await filteredLogs
            .select('policy_type')
            .count('* as total')
            .groupBy('policy_type');

        // Severity Distribution
        const severityDistribution = await filteredLogs
            .select('severity')
            .count('* as total')
            .groupBy('severity');

        // Top Violators
        const topViolators = await filteredLogs
            .select('user')
            .count('* as violations')
            .groupBy('user')
            .orderBy('violations', 'desc')
            .limit(10);

        return { totalByPolicy, severityDistribution, topViolators };
    }
}

module.exports = AuditAggregator;