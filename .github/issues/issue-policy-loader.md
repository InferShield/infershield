# Issue 2: Refactor Policy Loader to Support Automatic Policy Discovery

**Labels:** `enhancement`, `refactor`, `architecture`

## Problem Statement

Adding a new detection policy requires manual registration in `backend/src/policies/index.js`. This creates friction for external contributors and increases the chance of forgetting to register a policy.

The current approach doesn't scale well as the policy library grows.

## Proposed Approach

1. Refactor `backend/src/policies/index.js` to dynamically scan the `policies/` directory
2. Auto-import all files matching `*Policy.js` pattern
3. Validate each policy exports required interface:
   ```javascript
   export async function detect(request) { ... }
   export const metadata = { name, description, version }
   ```
4. Log discovered policies on startup
5. Skip invalid policies with warning (don't crash)
6. Add unit tests for the loader itself

## Acceptance Criteria

- [ ] New policies can be added by creating a file in `policies/` (no manual registration)
- [ ] Invalid policies are logged but don't break the app
- [ ] Startup logs show: "Loaded 12 detection policies"
- [ ] All existing policies continue to work
- [ ] Loader tests verify dynamic discovery works
- [ ] Documentation updated with new policy creation flow

## Estimated Complexity

8-12 hours

## Files to Modify

- `backend/src/policies/index.js` (major refactor)
- `backend/src/app.js` (update initialization)
- `backend/src/policies/__tests__/policyLoader.test.js` (create)
- `CONTRIBUTING.md` (update policy addition guide)

## Technical Notes

Use Node.js `fs.readdirSync()` and dynamic `import()` for policy discovery. Ensure ES modules work correctly with dynamic imports.
