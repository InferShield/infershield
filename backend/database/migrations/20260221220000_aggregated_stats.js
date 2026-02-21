exports.up = function(knex) {
  return knex.schema.createTable("aggregated_stats", function(table) {
    table.increments("id").primary();
    table.enu("period", ["7d", "30d", "90d"]).notNullable();
    table.date("start_date").notNullable();
    table.date("end_date").notNullable();
    table.jsonb("stats").notNullable();
    table.timestamp("created_at").defaultTo(knex.fn.now());

    table.index(["period", "start_date"], "idx_period_start_date");
  });
};

exports.down = function(knex) {
  return knex.schema.dropTable("aggregated_stats");
};