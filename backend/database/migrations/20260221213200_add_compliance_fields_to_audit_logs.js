/**
 * Migration: Add compliance-required fields to audit_logs table
 * 
 * Adds columns needed by the compliance reporting system:
 * - timestamp: When the event occurred
 * - policy_type: Type of policy triggered (e.g., prompt_injection, sql_injection)
 * - severity: Risk level (low, medium, high, critical)
 * - user_id: User who triggered the event (optional)
 * - status: Request status (allowed, blocked)
 * - risk_score: Numeric risk score (0-100)
 */

exports.up = async function(knex) {
  return knex.schema.table('audit_logs', (table) => {
    table.timestamp('timestamp').defaultTo(knex.fn.now());
    table.string('policy_type', 100);
    table.enum('severity', ['low', 'medium', 'high', 'critical']);
    table.string('user_id', 255);
    table.string('status', 50);
    table.integer('risk_score');
    table.string('agent_id', 255);
  });
};

exports.down = async function(knex) {
  return knex.schema.table('audit_logs', (table) => {
    table.dropColumn('timestamp');
    table.dropColumn('policy_type');
    table.dropColumn('severity');
    table.dropColumn('user_id');
    table.dropColumn('status');
    table.dropColumn('risk_score');
    table.dropColumn('agent_id');
  });
};
