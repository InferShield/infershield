/**
 * Migration: Create security_audit_logs table
 * 
 * Security audit trail for compliance reporting system operations
 * Tracks all access to sensitive resources (reports, templates, auth)
 */

exports.up = async function(knex) {
  return knex.schema.createTable('security_audit_logs', (table) => {
    table.increments('id').primary();
    table.string('action', 100).notNullable().index();
    table.string('user_id', 255).index();
    table.string('api_key', 255);
    table.string('resource_type', 50).notNullable().index();
    table.string('resource_id', 255).index();
    table.string('ip_address', 45);
    table.jsonb('metadata');
    table.enum('outcome', ['success', 'failure']).notNullable();
    table.timestamp('timestamp').defaultTo(knex.fn.now()).notNullable().index();
    
    // Indexes for common query patterns
    table.index(['user_id', 'timestamp']);
    table.index(['action', 'outcome', 'timestamp']);
    table.index(['resource_type', 'resource_id']);
  });
};

exports.down = async function(knex) {
  return knex.schema.dropTableIfExists('security_audit_logs');
};
