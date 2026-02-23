# Issue 1: Add Unit Test Coverage for Cross-Step Detection Logic

**Labels:** `enhancement`, `testing`, `good-first-issue`

## Problem Statement

The cross-step detection logic (READ → TRANSFORM → SEND) lacks comprehensive unit test coverage. This makes it harder to validate edge cases and catch regressions when modifying the detection engine.

Current integration tests exist, but unit-level coverage for individual policy evaluation steps is incomplete.

## Proposed Approach

1. Add unit tests in `backend/src/policies/__tests__/crossStepDetection.test.js`
2. Cover core scenarios:
   - Valid exfiltration chains (should block)
   - Benign multi-step sequences (should allow)
   - Partial chains that don't complete (should allow with lower risk)
   - Session timeout edge cases
   - Empty/null session history
   - Concurrent session tracking
3. Mock session storage to isolate policy logic
4. Use Jest's parameterized tests for input variations

## Acceptance Criteria

- [ ] Unit tests cover at least 85% of cross-step detection code paths
- [ ] All major edge cases have explicit test coverage
- [ ] Tests run in under 2 seconds
- [ ] No integration test dependencies (pure unit tests)
- [ ] Tests follow existing Jest conventions

## Estimated Complexity

4-6 hours

## Files to Modify

- `backend/src/policies/__tests__/crossStepDetection.test.js` (create)
- Possibly: `backend/src/policies/crossStepDetection.js` (refactor for testability if needed)
