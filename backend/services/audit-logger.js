const db = require('../db/db');

/**
 * Audit logger for security-sensitive operations
 * Logs all access to compliance reports and sensitive data
 */
class AuditLogger {
  /**
   * Log a security event
   * @param {Object} event - Event details
   * @param {string} event.action - Action performed (e.g., 'report.generated', 'report.accessed')
   * @param {string} event.userId - User ID who performed the action
   * @param {string} event.apiKey - API key used (if applicable)
   * @param {string} event.resourceType - Type of resource (e.g., 'report', 'template')
   * @param {string} event.resourceId - Resource identifier
   * @param {string} event.ipAddress - Client IP address
   * @param {Object} event.metadata - Additional context
   * @param {string} event.outcome - 'success' or 'failure'
   */
  async log(event) {
    const {
      action,
      userId = null,
      apiKey = null,
      resourceType,
      resourceId = null,
      ipAddress = null,
      metadata = {},
      outcome = 'success'
    } = event;

    try {
      await db.query(
        `INSERT INTO security_audit_logs 
         (action, user_id, api_key, resource_type, resource_id, ip_address, metadata, outcome, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          action,
          userId,
          apiKey,
          resourceType,
          resourceId,
          ipAddress,
          JSON.stringify(metadata),
          outcome
        ]
      );
    } catch (error) {
      // Don't throw - audit logging failures shouldn't break the application
      console.error('Audit log write failed:', error);
    }
  }

  /**
   * Log report generation
   */
  async logReportGenerated(userId, reportId, reportType, ipAddress, metadata = {}) {
    await this.log({
      action: 'report.generated',
      userId,
      resourceType: 'report',
      resourceId: reportId,
      ipAddress,
      metadata: { reportType, ...metadata },
      outcome: 'success'
    });
  }

  /**
   * Log report access/download
   */
  async logReportAccessed(userId, reportId, ipAddress, metadata = {}) {
    await this.log({
      action: 'report.accessed',
      userId,
      resourceType: 'report',
      resourceId: reportId,
      ipAddress,
      metadata,
      outcome: 'success'
    });
  }

  /**
   * Log report deletion
   */
  async logReportDeleted(userId, reportId, ipAddress, metadata = {}) {
    await this.log({
      action: 'report.deleted',
      userId,
      resourceType: 'report',
      resourceId: reportId,
      ipAddress,
      metadata,
      outcome: 'success'
    });
  }

  /**
   * Log authentication events
   */
  async logAuthEvent(action, userId, ipAddress, outcome, metadata = {}) {
    await this.log({
      action: `auth.${action}`,
      userId,
      resourceType: 'auth',
      ipAddress,
      metadata,
      outcome
    });
  }

  /**
   * Log template access
   */
  async logTemplateAccessed(userId, templateId, ipAddress, metadata = {}) {
    await this.log({
      action: 'template.accessed',
      userId,
      resourceType: 'template',
      resourceId: templateId,
      ipAddress,
      metadata,
      outcome: 'success'
    });
  }

  /**
   * Log failed access attempts
   */
  async logAccessDenied(action, userId, resourceType, resourceId, ipAddress, reason) {
    await this.log({
      action,
      userId,
      resourceType,
      resourceId,
      ipAddress,
      metadata: { reason },
      outcome: 'failure'
    });
  }

  /**
   * Query audit logs (admin only)
   * @param {Object} filters - Query filters
   * @returns {Promise<Array>} - Audit log entries
   */
  async queryLogs(filters = {}) {
    const {
      userId = null,
      action = null,
      resourceType = null,
      startDate = null,
      endDate = null,
      limit = 100
    } = filters;

    let query = 'SELECT * FROM security_audit_logs WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (userId) {
      query += ` AND user_id = $${paramIndex}`;
      params.push(userId);
      paramIndex++;
    }

    if (action) {
      query += ` AND action = $${paramIndex}`;
      params.push(action);
      paramIndex++;
    }

    if (resourceType) {
      query += ` AND resource_type = $${paramIndex}`;
      params.push(resourceType);
      paramIndex++;
    }

    if (startDate) {
      query += ` AND timestamp >= $${paramIndex}`;
      params.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      query += ` AND timestamp <= $${paramIndex}`;
      params.push(endDate);
      paramIndex++;
    }

    query += ` ORDER BY timestamp DESC LIMIT $${paramIndex}`;
    params.push(limit);

    const result = await db.query(query, params);
    return result.rows;
  }
}

module.exports = new AuditLogger();
