exports.up = function(knex) {
  return knex.schema.createTable('compliance_reports', (table) => {
    table.increments('id').primary();
    table.enu('framework', ['GDPR', 'SOC2', 'HIPAA']).notNullable();
    table.dateTime('date_range_start').notNullable();
    table.dateTime('date_range_end').notNullable();
    table.timestamp('generated_at').defaultTo(knex.fn.now()).notNullable();
    table.string('file_path').notNullable();
    table.enu('format', ['PDF', 'CSV', 'JSON']).notNullable();
    table.integer('user_id').notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('compliance_reports');
};