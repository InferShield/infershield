/**
 * User Accounts Migration
 * Creates users table for self-service signup
 */

exports.up = function(knex) {
  return knex.schema.createTable('users', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('email', 255).notNullable().unique();
    table.string('password_hash', 255).notNullable();
    table.string('name', 255);
    table.string('company', 255);
    
    // Stripe integration
    table.string('stripe_customer_id', 255).unique();
    table.string('stripe_subscription_id', 255);
    table.string('plan', 50).defaultTo('free'); // free, pro, enterprise
    table.enum('status', ['active', 'suspended', 'deleted']).defaultTo('active');
    
    // Verification
    table.boolean('email_verified').defaultTo(false);
    table.string('verification_token', 255);
    table.timestamp('verification_sent_at');
    
    // Security
    table.timestamp('last_login_at');
    table.string('last_login_ip', 45);
    table.integer('failed_login_attempts').defaultTo(0);
    table.timestamp('locked_until');
    
    // Timestamps
    table.timestamps(true, true);
    table.timestamp('deleted_at').nullable();
    
    // Indexes
    table.index('email');
    table.index('stripe_customer_id');
    table.index('status');
    table.index('created_at');
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('users');
};
