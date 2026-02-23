# Contributing to InferShield

Thank you for considering contributing to InferShield! 🛡️

This document provides guidelines for contributing to the project. We welcome all forms of contribution: bug reports, feature requests, documentation improvements, and code contributions.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Setup](#development-setup)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Testing Guidelines](#testing-guidelines)
- [Documentation](#documentation)
- [Community](#community)

## Code of Conduct

We are committed to providing a welcoming and inclusive environment. Please:

- **Be respectful** in all interactions
- **Be constructive** when giving feedback
- **Be collaborative** and help others
- **Be patient** with newcomers

Harassment, discrimination, or abusive behavior will not be tolerated.

## Getting Started

### Ways to Contribute

1. **Report bugs** - Found something broken? Let us know!
2. **Suggest features** - Have an idea? Share it!
3. **Improve documentation** - Typos, clarifications, examples
4. **Write code** - Bug fixes, features, tests
5. **Add detection policies** - New threat detection patterns
6. **Test & validate** - Try InferShield in different environments

### Before You Start

- **Check existing issues** to avoid duplicates
- **Search discussions** to see if your idea has been discussed
- **Read the docs** to understand the architecture
- **Join discussions** to get feedback before big changes

## How to Contribute

### Reporting Bugs

**Use the bug report template** when creating an issue. Include:

- **Description**: What happened vs. what should happen
- **Reproduction**: Step-by-step instructions to reproduce
- **Environment**: OS, Node version, InferShield version
- **Logs**: Relevant error messages or stack traces
- **Screenshots**: If applicable

**For security vulnerabilities**, please follow our [Security Policy](./SECURITY.md) and report privately to security@infershield.io.

### Suggesting Features

**Use the feature request template**. Include:

- **Problem**: What problem does this solve?
- **Solution**: Your proposed solution
- **Alternatives**: Other approaches you considered
- **Use case**: Real-world scenario where this helps

**Start a discussion** for large features before implementing.

### Improving Documentation

Documentation improvements are always welcome:

- Fix typos or unclear explanations
- Add examples or use cases
- Write tutorials or guides
- Improve code comments
- Update outdated information

**Small fixes** (typos, broken links): Submit a PR directly.

**Large changes** (new guides, restructuring): Open an issue first to discuss.

## Development Setup

### Prerequisites

- **Node.js**: v18+ (v20 recommended)
- **PostgreSQL**: 14+ (for backend)
- **Git**: For version control
- **Docker** (optional): For containerized development

### Fork and Clone

```bash
# Fork the repo on GitHub, then clone your fork:
git clone https://github.com/YOUR-USERNAME/infershield.git
cd infershield

# Add upstream remote:
git remote add upstream https://github.com/InferShield/infershield.git
```

### Install Dependencies

```bash
# Backend
cd backend
npm install
cp .env.example .env  # Configure your environment

# Proxy
cd ../proxy
npm install
cp .env.example .env

# Dashboard
cd ../dashboard
npm install
cp .env.example .env

# Extension (optional)
cd ../extension
npm install
```

### Database Setup

```bash
cd backend

# Start PostgreSQL (via Docker):
docker run -d \
  --name infershield-postgres \
  -e POSTGRES_PASSWORD=postgres \
  -e POSTGRES_DB=infershield \
  -p 5432:5432 \
  postgres:14

# Run migrations:
npx prisma migrate dev

# Seed demo data (optional):
npm run seed
```

### Run Locally

```bash
# Terminal 1 - Backend:
cd backend
npm run dev

# Terminal 2 - Proxy:
cd proxy
npm start

# Terminal 3 - Dashboard:
cd dashboard
npm start
```

Visit:
- Backend: http://localhost:5000
- Proxy: http://localhost:8000
- Dashboard: http://localhost:3000

### Run Tests

```bash
# Backend tests:
cd backend
npm test

# Proxy tests:
cd proxy
npm test

# Extension tests:
cd extension
npm test

# Run all tests (from root):
npm run test:all
```

## Pull Request Process

### 1. Create a Branch

```bash
# Update your fork:
git checkout main
git pull upstream main

# Create a feature branch:
git checkout -b feature/your-feature-name
# or
git checkout -b fix/your-bug-fix
```

**Branch naming:**
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation only
- `refactor/` - Code refactoring
- `test/` - Test additions/fixes

### 2. Make Changes

- Write clean, readable code
- Follow existing code style
- Add tests for new functionality
- Update documentation as needed
- Keep commits atomic and focused

### 3. Commit

```bash
git add .
git commit -m "feat: add PII detection for passport numbers"
```

**Commit message format:**

```
<type>: <description>

[optional body]

[optional footer]
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style (formatting, no logic change)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance (dependencies, build config)

**Examples:**
```
feat: add support for Anthropic Claude models
fix: correct SSN validation regex for false positives
docs: update quickstart guide for Windows
test: add integration tests for API key generation
```

### 4. Push and Create PR

```bash
git push origin feature/your-feature-name
```

Then create a pull request on GitHub:

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Fill out the PR template
4. Link related issues (e.g., "Closes #123")
5. Request review

### 5. Code Review

- Respond to feedback promptly
- Make requested changes
- Push additional commits (don't force-push during review)
- Mark conversations as resolved when addressed

### 6. Merge

Once approved, a maintainer will merge your PR. We use:
- **Squash and merge** for most PRs
- **Merge commit** for complex multi-commit PRs
- **Rebase and merge** rarely (only if history is clean)

## Coding Standards

### JavaScript/TypeScript

- **Style**: Follow existing code style (we use Prettier)
- **Linting**: Run `npm run lint` before committing
- **ES6+**: Use modern JavaScript features
- **Async/await**: Prefer over callbacks and raw promises
- **Error handling**: Always catch errors and handle gracefully

### Code Structure

- **Modularity**: Small, focused functions
- **DRY**: Don't repeat yourself
- **Comments**: Explain *why*, not *what*
- **Naming**: Descriptive names (not `x`, `tmp`, `data`)

### Security

- **Input validation**: Validate all user input
- **SQL injection**: Use parameterized queries (Prisma handles this)
- **XSS**: Sanitize output in dashboard
- **Secrets**: Never commit API keys or passwords

## Testing Guidelines

### Test Coverage

- **Unit tests**: For business logic and utilities
- **Integration tests**: For API endpoints and database
- **E2E tests**: For critical user flows

**Aim for:**
- 80%+ coverage for new features
- 100% coverage for security-critical code

### Writing Tests

```javascript
// Example unit test:
describe('PII Detection', () => {
  it('should detect SSN in various formats', () => {
    expect(detectSSN('123-45-6789')).toBe(true);
    expect(detectSSN('123456789')).toBe(true);
    expect(detectSSN('abc-de-fghi')).toBe(false);
  });
});
```

### Running Tests

```bash
# Run all tests:
npm test

# Run specific test file:
npm test path/to/test.spec.js

# Run with coverage:
npm run test:coverage

# Watch mode (during development):
npm run test:watch
```

## Documentation

### Code Documentation

- **Functions**: JSDoc comments for public APIs
- **Complex logic**: Inline comments explaining approach
- **Types**: Use TypeScript or JSDoc type annotations

```javascript
/**
 * Detects PII in the given text.
 * @param {string} text - The text to analyze
 * @param {Object} options - Detection options
 * @param {boolean} options.strict - Use strict detection mode
 * @returns {Array<PIIMatch>} Array of detected PII instances
 */
function detectPII(text, options = {}) {
  // ...
}
```

### User Documentation

- **README**: Keep it concise and up-to-date
- **Guides**: Step-by-step tutorials in `/docs`
- **API docs**: OpenAPI/Swagger for REST endpoints
- **Examples**: Show real-world usage

### Changelog

- Update CHANGELOG.md for all user-facing changes
- Follow [Keep a Changelog](https://keepachangelog.com/) format
- Include version number and release date

## Adding New Detection Policies

Detection policies are the core of InferShield's threat detection capabilities. If you want to add a new detection pattern, this section will guide you through the process.

### Where Policy Code Lives

Detection policies are located in the `backend/src/policies` directory. Each policy is implemented as a separate module that exports a detection function.

### Policy Structure

All policies follow a consistent structure:

```javascript
// backend/src/policies/examplePolicy.js

/**
 * Example Policy: Detects [specific threat pattern]
 * @param {Object} request - The request object to analyze
 * @param {string} request.prompt - The user's prompt text
 * @param {string} request.response - The LLM's response text (if available)
 * @param {Object} request.metadata - Additional context (user ID, model, etc.)
 * @param {Array} request.sessionHistory - Previous requests in this session
 * @returns {Object} Detection result
 */
export async function detectExampleThreat(request) {
  const findings = [];
  
  // Your detection logic here
  if (containsThreatPattern(request.prompt)) {
    findings.push({
      type: 'EXAMPLE_THREAT',
      severity: 'HIGH',  // LOW, MEDIUM, HIGH, CRITICAL
      confidence: 0.85,  // 0.0 - 1.0
      description: 'Description of what was detected',
      matchedPattern: 'specific pattern that triggered detection',
      recommendation: 'How to mitigate this threat'
    });
  }
  
  return {
    detected: findings.length > 0,
    findings,
    riskScore: calculateRiskScore(findings)  // 0-100
  };
}

function containsThreatPattern(text) {
  // Detection implementation
  return /malicious-pattern/.test(text);
}

function calculateRiskScore(findings) {
  // Risk scoring logic
  return findings.length > 0 ? 75 : 0;
}
```

### Adding a New Policy

1. **Create a new file** in `backend/src/policies/`:
   ```bash
   touch backend/src/policies/yourPolicyName.js
   ```

2. **Implement your detection logic** following the structure above.

3. **Register your policy** in `backend/src/policies/index.js`:
   ```javascript
   import { detectExampleThreat } from './examplePolicy.js';
   import { detectYourThreat } from './yourPolicyName.js';  // Add this
   
   export const policies = [
     { name: 'example-threat', detect: detectExampleThreat },
     { name: 'your-threat', detect: detectYourThreat },  // Add this
   ];
   ```

4. **Add configuration** in `backend/src/config/policies.js`:
   ```javascript
   export const policyConfig = {
     'your-threat': {
       enabled: true,
       threshold: 0.7,  // Confidence threshold for alerting
       severity: 'HIGH'
     }
   };
   ```

### Testing Requirements

All new policies must include tests:

```javascript
// backend/src/policies/__tests__/yourPolicyName.test.js

import { detectYourThreat } from '../yourPolicyName.js';

describe('Your Threat Detection', () => {
  it('should detect malicious pattern', async () => {
    const request = {
      prompt: 'malicious input here',
      metadata: {}
    };
    
    const result = await detectYourThreat(request);
    
    expect(result.detected).toBe(true);
    expect(result.findings).toHaveLength(1);
    expect(result.findings[0].type).toBe('YOUR_THREAT');
  });
  
  it('should not flag benign input', async () => {
    const request = {
      prompt: 'normal user query',
      metadata: {}
    };
    
    const result = await detectYourThreat(request);
    
    expect(result.detected).toBe(false);
  });
  
  // Add more test cases for edge cases, false positives, etc.
});
```

**Run tests:**
```bash
cd backend
npm test -- yourPolicyName.test.js
```

### Example PR Structure

Your pull request should include:

1. **The policy file**: `backend/src/policies/yourPolicyName.js`
2. **Registration**: Update to `backend/src/policies/index.js`
3. **Configuration**: Update to `backend/src/config/policies.js`
4. **Tests**: `backend/src/policies/__tests__/yourPolicyName.test.js`
5. **Documentation**: Add entry to `docs/DETECTION_POLICIES.md`
6. **Changelog**: Update `CHANGELOG.md` under "Unreleased"

**Example PR title and description:**

```
Title: feat: add detection for [specific threat type]

Description:
Adds a new detection policy for [threat type] attacks.

Detection approach:
- [Explain the detection logic]
- [Mention any patterns or heuristics used]

Test coverage:
- ✅ Detects malicious patterns
- ✅ Avoids false positives on benign input
- ✅ Handles edge cases (empty input, encoding, etc.)

Example detections:
- [Show 2-3 examples of what this policy catches]

Limitations:
- [Be honest about what this doesn't catch]
```

### Policy Design Guidelines

**Good detection policies:**
- ✅ Have clear, measurable detection criteria
- ✅ Minimize false positives
- ✅ Include confidence scores (not just binary detection)
- ✅ Provide actionable recommendations
- ✅ Document known limitations

**Avoid:**
- ❌ Overly broad patterns that flag benign content
- ❌ Hard-coded keywords without context analysis
- ❌ Expensive operations (heavy regex, external API calls)
- ❌ Non-deterministic behavior (unless intentional)

### Getting Feedback

Before investing significant time:
1. **Open a discussion** describing the threat pattern
2. **Share examples** of attacks this would catch
3. **Get feedback** on approach and false positive risk

This helps ensure your contribution aligns with project goals and avoids duplicate work.

## Community

### Communication Channels

- **GitHub Issues**: Bug reports, feature requests
- **GitHub Discussions**: Questions, ideas, general discussion
- **Discord**: Coming soon
- **Email**: security@infershield.io (security only)

### Getting Help

- **Documentation**: Check `/docs` first
- **Search issues**: Your question may already be answered
- **Ask in discussions**: The community is here to help
- **Be specific**: Provide context, code samples, error messages

### Recognition

Contributors are recognized in:
- Release notes (for significant contributions)
- [CONTRIBUTORS.md](./docs/CONTRIBUTORS.md) (all contributors)
- GitHub contributor graph

## License

By contributing to InferShield, you agree that your contributions will be licensed under the MIT License.

---

## Questions?

Not sure where to start? Have questions about the contribution process?

- **Open a discussion**: [GitHub Discussions](https://github.com/InferShield/infershield/discussions)
- **Join the community**: (Discord coming soon)
- **Email**: hello@infershield.io

---

**Thank you for contributing to InferShield! Together, we're making LLM security accessible to everyone.** 🛡️
