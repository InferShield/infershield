exports.up = function (knex) {
    return knex.schema.createTable('policies', (table) => {
        table.increments('id').primary();
        table.string('name').notNullable();
        table.text('rule').notNullable();
        table.timestamp('created_at').defaultTo(knex.fn.now());
    });
};

exports.down = function (knex) {
    return knex.schema.dropTableIfExists('policies');
};