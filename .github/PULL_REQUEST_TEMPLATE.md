# Pull Request

## Description

<!-- Provide a clear and concise description of what this PR does -->

## Related Issues

<!-- Link related issues using keywords: Closes #123, Fixes #456, Relates to #789 -->

Closes #

## Type of Change

<!-- Check all that apply -->

- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🎨 Style/UI change (non-functional, design improvements)
- [ ] ♻️ Refactoring (no functional changes)
- [ ] ⚡ Performance improvement
- [ ] ✅ Test addition or update
- [ ] 🔧 Configuration change
- [ ] 🚀 CI/CD change

## Component

<!-- Check all components affected by this PR -->

- [ ] Proxy (`/proxy`)
- [ ] Platform/Backend (`/backend`)
- [ ] Dashboard (`/dashboard`)
- [ ] Extension (`/extension`)
- [ ] Documentation (`/docs`)
- [ ] Infrastructure (`/k8s`, `/scripts`)

## Changes Made

<!-- List the specific changes you made -->

- 
- 
- 

## Testing

### Test Coverage

- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] E2E tests added/updated
- [ ] Manual testing performed
- [ ] No tests needed (explain why below)

### Test Evidence

<!-- Describe how you tested these changes -->

**Steps to test:**
1. 
2. 
3. 

**Test results:**
<!-- Include screenshots, logs, or test output -->

```
# Paste test output here
```

## Checklist

<!-- Mark items as complete with [x] -->

### Code Quality

- [ ] Code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have commented my code, particularly in hard-to-understand areas
- [ ] My changes generate no new warnings or errors
- [ ] I have run `npm run lint` and fixed all issues

### Documentation

- [ ] I have updated relevant documentation (README, /docs)
- [ ] I have updated the CHANGELOG.md (if user-facing change)
- [ ] I have added/updated JSDoc comments for new/modified functions
- [ ] I have added/updated inline comments for complex logic

### Testing

- [ ] All existing tests pass (`npm test`)
- [ ] I have added tests that prove my fix is effective or my feature works
- [ ] New and existing unit tests pass locally with my changes
- [ ] I have tested this on multiple environments (if applicable)

### Security

- [ ] This change does not introduce security vulnerabilities
- [ ] I have validated all user inputs
- [ ] I have not exposed sensitive information (keys, passwords, etc.)
- [ ] I have followed secure coding practices

### Breaking Changes

- [ ] This PR includes breaking changes
  - [ ] I have documented the migration path in CHANGELOG.md
  - [ ] I have updated all examples and documentation
  - [ ] I have added deprecation warnings (if phased rollout)

## Screenshots/Videos

<!-- If applicable, add screenshots or videos to demonstrate the changes -->

**Before:**


**After:**


## Performance Impact

<!-- Describe any performance implications of this change -->

- [ ] No performance impact
- [ ] Improves performance (describe below)
- [ ] May impact performance (describe below)

**Details:**


## Deployment Notes

<!-- Any special instructions for deploying this change? -->

**Environment variables:**
<!-- List any new or changed environment variables -->

**Database migrations:**
<!-- Are database migrations required? -->

- [ ] No migrations needed
- [ ] Migrations included (run `npx prisma migrate deploy`)

**Configuration changes:**
<!-- Any config file changes required? -->


## Rollback Plan

<!-- How can this change be rolled back if issues arise? -->


## Additional Context

<!-- Any other information reviewers should know -->


## Reviewer Guidance

<!-- Help reviewers focus on critical areas -->

**Focus areas:**
- 
- 

**Concerns:**
- 

---

## Post-Merge Checklist

<!-- Items to complete after merging (for maintainers) -->

- [ ] Update project board
- [ ] Close related issues
- [ ] Update documentation site (if applicable)
- [ ] Announce in Discord/community (if major change)
- [ ] Create release notes (if releasing)

---

**By submitting this pull request, I confirm that my contribution is made under the terms of the MIT License.**
