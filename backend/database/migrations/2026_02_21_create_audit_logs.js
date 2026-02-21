exports.up = function (knex) {
    return knex.schema.createTable('audit_logs', (table) => {
        table.increments('id').primary();
        table.text('prompt').notNullable();
        table.text('response').notNullable();
        table.jsonb('metadata');
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('audit_logs');
};