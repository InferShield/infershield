const fs = require('fs');
const path = require('path');
const os = require('os');

const { loadPolicies } = require('../../lib/policyLoader');

describe('policyLoader', () => {
  test('loadPolicies appends discovered policies from policies.d', () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'infershield-policies-'));

    const policyFile = path.join(tmp, 'custom.json');
    fs.writeFileSync(policyFile, JSON.stringify([
      {
        name: 'Custom Policy',
        rule_value: '(custom)'
      }
    ]));

    const defaults = [{ id: 1, name: 'Default', rule_value: '(default)' }];

    const loaded = loadPolicies(defaults, { policyDir: tmp });

    expect(loaded).toHaveLength(2);
    expect(loaded[0].name).toBe('Default');
    expect(loaded[1].name).toBe('Custom Policy');
    expect(loaded[1].id).toBeGreaterThan(1);
    expect(loaded[1].source).toBe('file:custom.json');
  });
});
