exports.seed = async function (knex) {
    // Deletes ALL existing entries
    await knex('audit_logs').del();
    await knex('policies').del();

    // Insert seed entries for audit_logs
    await knex('audit_logs').insert([
        { prompt: 'Hello, who are you?', response: 'I am an AI assistant.', metadata: JSON.stringify({ source: 'test-seed' }) },
        { prompt: 'DROP TABLE users;', response: 'Action not allowed.', metadata: JSON.stringify({ source: 'test-seed' }) },
    ]);

    // Insert seed entries for policies
    await knex('policies').insert([
        { name: 'No SQL Keywords', rule: 'DROP|TABLE|SELECT|DELETE' },
        { name: 'Block Scripts', rule: '<script>' },
    ]);
};