/**
 * Usage Tracking Migration
 * Creates usage_records table for metering and billing
 */

exports.up = function(knex) {
  return knex.schema.createTable('usage_records', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    table.uuid('api_key_id').references('id').inTable('api_keys').onDelete('SET NULL');
    
    // Time period (for aggregation)
    table.date('period_date').notNullable(); // Daily aggregation
    table.integer('period_hour').notNullable().defaultTo(0); // 0-23 for hourly breakdowns
    
    // Usage metrics
    table.bigInteger('request_count').defaultTo(0);
    table.bigInteger('total_tokens').defaultTo(0); // If tracking token usage
    table.bigInteger('total_cost_cents').defaultTo(0); // Cost in cents
    
    // Request type breakdown
    table.bigInteger('requests_openai').defaultTo(0);
    table.bigInteger('requests_anthropic').defaultTo(0);
    table.bigInteger('requests_other').defaultTo(0);
    
    // PII detection stats
    table.bigInteger('pii_detections').defaultTo(0);
    table.bigInteger('pii_redactions').defaultTo(0);
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('api_key_id');
    table.index('period_date');
    table.index(['user_id', 'period_date']);
    table.index(['user_id', 'period_date', 'period_hour']);
    
    // Unique constraint: one record per user per hour
    table.unique(['user_id', 'period_date', 'period_hour']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('usage_records');
};
