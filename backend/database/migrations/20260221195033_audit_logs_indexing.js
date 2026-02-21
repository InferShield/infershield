exports.up = async function(knex) {
  const hasTable = await knex.schema.hasTable('audit_logs');
  if (hasTable) {
    return knex.schema.table('audit_logs', (table) => {
      table.index('timestamp');
      table.index('policy_type');
      table.index('severity');
      table.index(['timestamp', 'policy_type', 'severity']); // Composite index
    });
  } else {
    console.warn('Table "audit_logs" does not exist. Skipping indexes creation.');
  }
};

exports.down = async function(knex) {
  const hasTable = await knex.schema.hasTable('audit_logs');
  if (hasTable) {
    return knex.schema.table('audit_logs', (table) => {
      table.dropIndex('timestamp');
      table.dropIndex('policy_type');
      table.dropIndex('severity');
      table.dropIndex(['timestamp', 'policy_type', 'severity']);
    });
  } else {
    console.warn('Table "audit_logs" does not exist. Skipping indexes removal.');
  }
};