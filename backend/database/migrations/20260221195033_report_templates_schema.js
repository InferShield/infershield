exports.up = function(knex) {
  return knex.schema.createTable('report_templates', (table) => {
    table.increments('id').primary();
    table.enu('framework', ['GDPR', 'SOC2', 'HIPAA']).notNullable();
    table.enu('type', ['executive_summary', 'detailed_audit', 'incident_report']).notNullable();
    table.string('file_path').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now()).notNullable();
    table.timestamp('updated_at').defaultTo(knex.fn.now()).notNullable();
  });
};

exports.down = function(knex) {
  return knex.schema.dropTableIfExists('report_templates');
};