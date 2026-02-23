# InferShield v0.8.0 Release Checklist

**Date:** February 23, 2026  
**Version:** 0.8.0  
**Branch:** main

---

## Pre-Release Verification

### 1. Run All Tests

```bash
cd /home/openclaw/.openclaw/workspace/infershield/backend

# Smoke tests (core modules load correctly)
npm test tests/smoke.test.js
# Expected: 4/4 tests passing

# Integration tests (cross-step detection)
npm test tests/integration/crossStepDetection.test.js
# Expected: 2/2 tests passing (blocks exfiltration, allows benign workflow)

# Optional: Run all tests
npm test
```

**✅ Verification:** All tests must pass before proceeding.

---

### 2. Verify Documentation

```bash
cd /home/openclaw/.openclaw/workspace/infershield

# Check README update
grep -A 5 "Cross-Step Escalation Detection" README.md
# Expected: Section exists with 3-step example

# Check CHANGELOG entry
grep -A 10 "\[0.8.0\]" CHANGELOG.md
# Expected: Entry dated 2026-02-23 with Added/Refactored sections

# Verify attack scenario doc exists
ls -lh docs/ATTACK_SCENARIO_CROSS_STEP.md
# Expected: File exists, ~14-16 KB

# Verify test summary exists
ls -lh TEST_VALIDATION_SUMMARY.md
# Expected: File exists, ~4-5 KB
```

**✅ Verification:** All documentation files present and accurate.

---

### 3. Verify Git Status

```bash
cd /home/openclaw/.openclaw/workspace/infershield

# Check current branch
git branch --show-current
# Expected: main

# Check for uncommitted changes
git status
# Expected: "nothing to commit, working tree clean"

# View recent commits
git log --oneline -5
# Expected: Recent commits for v0.8.0 features visible
```

**✅ Verification:** Clean working tree on main branch.

---

## Release Tagging

### 4. Create Git Tag

```bash
cd /home/openclaw/.openclaw/workspace/infershield

# Create annotated tag
git tag -a v0.8.0 -m "Release v0.8.0: Cross-step escalation detection

Added:
- Session tracking middleware
- CrossStepEscalationPolicy (multi-step attack detection)
- Content analyzer (action classification)
- Integration tests (3-step exfiltration blocking validated)

Refactored:
- Extensible policy engine architecture

Limitations:
- In-memory session storage (no persistence)
- Rule-based detection (no ML models)
- Proof-of-concept implementation"

# Verify tag created
git tag -l -n9 v0.8.0
# Expected: Tag with full message displayed
```

**✅ Verification:** Tag v0.8.0 created with complete description.

---

### 5. Push to Remote

```bash
cd /home/openclaw/.openclaw/workspace/infershield

# Push main branch (if not already pushed)
git push origin main

# Push tag
git push origin v0.8.0

# Verify tag on remote
git ls-remote --tags origin | grep v0.8.0
# Expected: refs/tags/v0.8.0 visible
```

**✅ Verification:** Tag pushed to remote repository.

---

## GitHub Release (Manual Steps)

### 6. Create GitHub Release

**Navigate to:** https://github.com/[YourUsername]/infershield/releases/new

**Tag:** v0.8.0 (select existing tag)

**Release Title:** InferShield v0.8.0 - Cross-Step Escalation Detection

**Description:**
```markdown
## What's New

InferShield v0.8.0 introduces **cross-step escalation detection**: session-aware policy evaluation that tracks action sequences across requests to detect multi-step attacks.

### Added
- **Session Tracking**: In-memory correlation of requests by session ID (1-hour expiry, last 50 requests)
- **CrossStepEscalationPolicy**: Detects multi-step attack sequences:
  - READ → TRANSFORM → SEND exfiltration chains (risk: 95)
  - Privilege escalation sequences (LOW → MEDIUM → HIGH)
  - Sensitive data transmission after collection
- **Content Analyzer**: Action classification for prompts (DATABASE_READ, FILE_READ, EXTERNAL_API_CALL, DATA_TRANSFORM, PRIVILEGED_WRITE)
- **Integration Tests**: Validates 3-step exfiltration chain blocking and benign workflow handling

### Refactored
- **Extensible Policy Engine**: Pluggable architecture supporting single-request and cross-step policies
- Migrated legacy regex patterns into modular SingleRequestPolicy
- Decoupled policy evaluation from route handlers

### Documentation
- [Attack Scenario: Cross-Step Exfiltration](./docs/ATTACK_SCENARIO_CROSS_STEP.md) - Technical deep dive with test coverage
- [Test Validation Summary](./TEST_VALIDATION_SUMMARY.md) - Complete proof documentation
- Updated [README](./README.md) with cross-step detection explanation

### Known Limitations
- In-memory session storage (no Redis/persistence in v0.8.0)
- Single-instance design (no distributed session sharing)
- Rule-based detection patterns (no ML models)

### Testing
```bash
# Smoke tests
npm test tests/smoke.test.js  # 4/4 pass

# Integration tests
npm test tests/integration/crossStepDetection.test.js  # 2/2 pass
```

See [CHANGELOG.md](./CHANGELOG.md) for complete details.

---

**What this means:** Single-request analysis misses multi-step attacks. v0.8.0 closes that gap by tracking action sequences across a session. A 3-step exfiltration chain (data read → format → external send) is now detected and blocked.

**Proof:** Integration tests validate the detection logic. See `docs/ATTACK_SCENARIO_CROSS_STEP.md` for technical details.
```

**Attach:**
- No binaries (code-only release)

**Mark as:** Pre-release (optional, if not production-hardened)

**✅ Verification:** GitHub release created with v0.8.0 tag.

---

## Post-Release Verification

### 7. Verify Public Links

```bash
# Check README links work
cd /home/openclaw/.openclaw/workspace/infershield
grep -o 'docs/ATTACK_SCENARIO_CROSS_STEP.md' README.md
# Expected: Relative path found (will work on GitHub)

# Verify CHANGELOG version order
head -30 CHANGELOG.md | grep -E "\[0\.[0-9]+\.[0-9]+\]"
# Expected: v0.8.0 appears before v0.8.1 (if 0.8.1 exists) or as latest
```

**✅ Verification:** Documentation links functional on GitHub.

---

### 8. Optional: Announce Release

**Twitter (if desired):**
```
InferShield v0.8.0 released: cross-step escalation detection.

Session-aware policy evaluation tracks action sequences to detect multi-step attacks that single-request analysis misses.

3-step exfiltration chain blocked: data read → transform → external send.

Proof: integration tests + attack scenario doc
```

**Keep it technical. No hype. Link to GitHub release.**

---

## Rollback Plan (If Issues Found)

```bash
cd /home/openclaw/.openclaw/workspace/infershield

# Delete tag locally
git tag -d v0.8.0

# Delete tag remotely
git push origin :refs/tags/v0.8.0

# Delete GitHub release
# (Manual: Navigate to GitHub releases page and delete)

# Revert commits if needed
git revert HEAD~3..HEAD  # Revert last 3 commits (adjust range)
git push origin main
```

**✅ Only use if critical issues discovered post-release.**

---

## Completion Sign-Off

- [ ] All tests passing (smoke + integration)
- [ ] Documentation updated (README, CHANGELOG, attack scenario)
- [ ] Git tag v0.8.0 created and pushed
- [ ] GitHub release created
- [ ] Public links verified functional
- [ ] Claims validated (no ML, no production-hardening, in-memory acknowledged)

**Released by:** _________________________  
**Date:** _________________________  
**Time:** _________________________

---

**Status:** Ready for release ✅
