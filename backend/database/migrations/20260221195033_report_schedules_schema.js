exports.up = function(knex) {
  return knex.schema.createTable('report_schedules', (table) => {
    table.increments('id').primary();
    table.enu('framework', ['GDPR', 'SOC2', 'HIPAA']).notNullable();
    table.string('cron_expression').notNullable();
    table.json('filters').nullable();
    table.boolean('enabled').defaultTo(true).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('report_schedules');
};