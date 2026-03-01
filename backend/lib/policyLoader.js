const fs = require('fs');
const path = require('path');

function isPlainObject(v) {
  return v && typeof v === 'object' && !Array.isArray(v);
}

/**
 * Discover additional regex/pattern policies from disk.
 *
 * Files: JSON in `policyDir` (default: backend/policies.d)
 * Format: either a single policy object or an array of policy objects.
 *
 * Note: This augments the in-memory policy list used by backend/server.js.
 */
function discoverPolicies({
  policyDir,
  startId = 1
} = {}) {
  const dir = policyDir || path.join(__dirname, '..', 'policies.d');

  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true })
    .filter(d => d.isFile() && d.name.toLowerCase().endsWith('.json'))
    .map(d => d.name)
    .sort();

  const discovered = [];
  let nextId = startId;

  for (const name of entries) {
    const filePath = path.join(dir, name);
    let json;
    try {
      json = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    } catch (e) {
      // Skip invalid JSON
      continue;
    }

    const items = Array.isArray(json) ? json : [json];

    for (const item of items) {
      if (!isPlainObject(item)) continue;

      // Minimal required fields
      if (!item.name || !item.rule_value) continue;

      discovered.push({
        id: nextId++,
        name: String(item.name),
        description: item.description ? String(item.description) : '',
        rule_type: item.rule_type ? String(item.rule_type) : 'pattern',
        rule_value: String(item.rule_value),
        action: item.action ? String(item.action) : 'block',
        enabled: item.enabled !== undefined ? Boolean(item.enabled) : true,
        weight: item.weight !== undefined ? Number(item.weight) : 50,
        source: `file:${name}`
      });
    }
  }

  return discovered;
}

function loadPolicies(defaultPolicies, options = {}) {
  const defaults = Array.isArray(defaultPolicies) ? defaultPolicies : [];
  const maxId = defaults.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0);
  const extra = discoverPolicies({
    policyDir: options.policyDir,
    startId: maxId + 1
  });

  return [...defaults, ...extra];
}

module.exports = {
  discoverPolicies,
  loadPolicies
};
