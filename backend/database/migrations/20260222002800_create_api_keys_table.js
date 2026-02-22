/**
 * API Keys Migration
 * Creates api_keys table for customer access tokens
 */

exports.up = function(knex) {
  return knex.schema.createTable('api_keys', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('user_id').notNullable().references('id').inTable('users').onDelete('CASCADE');
    
    // Key data
    table.string('key_hash', 255).notNullable().unique(); // bcrypt hash of the key
    table.string('key_prefix', 20).notNullable(); // First 8 chars for display (e.g., "isk_live_")
    table.string('name', 100); // Optional user-friendly name
    table.text('description');
    
    // Permissions & scope
    table.jsonb('permissions').defaultTo('{}'); // Future: scope restrictions
    table.string('environment', 20).defaultTo('production'); // production, development, test
    
    // Status
    table.enum('status', ['active', 'revoked', 'expired']).defaultTo('active');
    table.timestamp('last_used_at');
    table.timestamp('expires_at');
    table.timestamp('revoked_at');
    table.string('revoked_by_user_id', 255);
    table.text('revoked_reason');
    
    // Usage tracking
    table.bigInteger('total_requests').defaultTo(0);
    table.timestamp('first_used_at');
    
    // Timestamps
    table.timestamps(true, true);
    
    // Indexes
    table.index('user_id');
    table.index('key_hash');
    table.index('key_prefix');
    table.index('status');
    table.index('last_used_at');
    table.index(['user_id', 'status']);
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('api_keys');
};
