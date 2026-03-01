# Policy Packs (Discovery)

InferShield backend supports **auto-discovery** of additional pattern policies from JSON files in this directory.

## Format

- Place one or more `*.json` files in this folder.
- Each JSON file can be either:
  - a single policy object, or
  - an array of policy objects.

Example:

```json
[
  {
    "name": "Example: Block data exfil",
    "description": "Block obvious outbound exfil requests",
    "rule_type": "pattern",
    "rule_value": "(send|exfiltrate).*?(password|secret|token)",
    "action": "block",
    "weight": 80,
    "enabled": true
  }
]
```

## Notes

- Discovered policies are **appended** to the default in-memory policy list.
- IDs are assigned automatically.
- Invalid JSON files are ignored.
