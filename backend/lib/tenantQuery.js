/**
 * Tenant-Scoped Query Builder
 * 
 * Automatically injects user_id scoping to all queries on tenant-scoped tables.
 * This prevents cross-tenant data leakage by ensuring queries are always filtered
 * by the authenticated user's ID.
 * 
 * Usage:
 *   const tdb = tenantQuery(db, userId);
 *   await tdb('audit_logs').select('*'); // Automatically adds .where('user_id', userId)
 * 
 * Non-tenant tables (users, webhooks, etc.) pass through without modification.
 */

// Tables that require tenant scoping (user_id filtering)
const TENANT_TABLES = [
  'audit_logs',
  'api_keys',
  'usage_records',
  'policies',
  'compliance_reports',
  'report_schedules',
  'report_templates',
  'security_audit_logs'
];

/**
 * Create a tenant-scoped database query builder
 * @param {Object} db - Knex database instance
 * @param {number|string} userId - User ID for tenant scoping
 * @returns {Function} - Proxied database query builder
 */
function tenantQuery(db, userId) {
  if (!userId) {
    throw new Error('[SECURITY] tenantQuery requires a userId. Cross-tenant isolation cannot be guaranteed without it.');
  }

  // Validate userId is a valid identifier (number or UUID string)
  if (typeof userId !== 'number' && typeof userId !== 'string') {
    throw new Error(`[SECURITY] Invalid userId type: ${typeof userId}. Expected number or string.`);
  }

  // Return a function that wraps Knex query builder
  return function(tableName) {
    const query = db(tableName);

    // Only inject user_id for tenant-scoped tables
    if (TENANT_TABLES.includes(tableName)) {
      // Return a proxy that intercepts query execution methods
      return new Proxy(query, {
        get(target, prop) {
          const original = target[prop];

          // Intercept execution methods (then, catch, finally, etc.)
          if (typeof original === 'function' && ['then', 'catch', 'finally'].includes(prop)) {
            return function(...args) {
              // Auto-inject user_id filter before executing
              // Check if user_id is already in the where clause
              const queryObj = target.toString();
              
              // If user_id isn't already filtered, add it
              if (!queryObj.includes('user_id')) {
                target.where('user_id', userId);
              }

              return original.apply(target, args);
            };
          }

          // For chaining methods, return the original
          if (typeof original === 'function') {
            return function(...args) {
              const result = original.apply(target, args);
              // Return the same proxy for method chaining
              return result === target ? new Proxy(result, this) : result;
            };
          }

          return original;
        }
      });
    }

    // Non-tenant tables: return query as-is (no scoping)
    return query;
  };
}

/**
 * Bypass tenant scoping for admin operations
 * Use with extreme caution - only for system operations that legitimately need cross-tenant access
 * @param {Object} db - Knex database instance
 * @returns {Object} - Unscoped database instance
 */
function adminQuery(db) {
  console.warn('[SECURITY] adminQuery bypasses tenant scoping. Ensure this is intentional.');
  return db;
}

module.exports = {
  tenantQuery,
  adminQuery,
  TENANT_TABLES
};
