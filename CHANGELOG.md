# Changelog

All notable changes to InferShield will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Coming Soon
- Chrome extension (pending Chrome Web Store review)
- Firefox extension
- Safari extension
- Enhanced ML-based detection models
- Custom policy builder UI

## [0.8.1] - Proxy - 2026-02-22

### Added
- **PII/Secrets Blocking**: Real-time detection and blocking of personally identifiable information and secrets in prompts
- **Cross-platform Support**: Verified Windows and Linux compatibility
- **Enhanced Logging**: Improved request/response logging with risk scores
- **Performance Improvements**: Reduced latency overhead to < 1ms

### Fixed
- Windows path handling for configuration files
- SSL certificate validation on Linux systems
- Memory leak in long-running proxy sessions

### Security
- Added rate limiting per API key
- Improved input sanitization
- Enhanced detection patterns for obfuscated PII

## [0.7.0] - Platform - 2026-02-22

### Added
- **Self-Service Platform**: Complete user onboarding system
  - User registration and authentication
  - Email verification flow
  - JWT-based session management (7-day expiry)
  - Password reset functionality
- **API Key Management**:
  - Generate unlimited API keys per user
  - Key naming and environment tagging (production, test, development)
  - Secure key storage (bcrypt hashing)
  - One-time key display for security
  - Key revocation and usage tracking
- **Usage Tracking & Quotas**:
  - Real-time request metering
  - Free tier: 100 requests/month
  - Usage dashboard with daily/monthly breakdowns
  - Quota enforcement with graceful degradation
- **PII Detection Engine**:
  - 15+ PII pattern types (SSN, credit cards, emails, phone numbers, etc.)
  - Luhn algorithm validation for credit cards
  - Configurable detection sensitivity
  - PII redaction in logs
- **Demo Mode**:
  - Try InferShield without signup
  - Pre-configured demo API key
  - Sample threat scenarios
  - Limited to 10 requests
- **Monitoring & Observability**:
  - Sentry integration for error tracking
  - Prometheus metrics export
  - Structured logging (JSON format)
  - Health check endpoints
- **Database**:
  - PostgreSQL backend
  - Prisma ORM integration
  - Automated migrations
  - Connection pooling

### Changed
- Dashboard redesigned for logged-in users
- API endpoints now require authentication (except demo mode)
- Improved error messages and validation feedback
- Enhanced security posture across all endpoints

### Security
- All passwords bcrypt-hashed (10 rounds)
- API keys bcrypt-hashed for storage
- JWT tokens with secure expiry
- Rate limiting on authentication endpoints
- Input validation on all user-provided data

### Documentation
- Comprehensive platform documentation
- API reference with authentication examples
- Deployment guides for Railway, AWS, GCP, Azure
- Security model documentation
- PII detection guide

## [0.6.0] - 2026-02-15

### Added
- Initial public release
- OpenAI-compatible proxy server
- Basic threat detection policies
- Simple dashboard interface
- Docker support

### Security
- Prompt injection detection
- Data exfiltration prevention
- Basic audit logging

---

## Version Numbering

InferShield uses separate versioning for major components:

- **Platform** (`backend/`): User management, API, database (currently v0.7.0)
- **Proxy** (`proxy/`): Security proxy server (currently v0.8.1)
- **Extension** (`extension/`): Browser extensions (currently v1.0.0-rc1, pending review)
- **Dashboard** (`dashboard/`): Web UI (follows platform version)

When referencing versions, specify the component (e.g., "Proxy v0.8.1" or "Platform v0.7.0").

---

**Detailed release notes:**
- [v0.7.0 Release Notes](./docs/releases/RELEASE_NOTES_v0.7.0.md)
- [v0.7.0 Test Results](./docs/releases/TEST_RESULTS_v0.7.0.md)

[Unreleased]: https://github.com/InferShield/infershield/compare/v0.8.1...HEAD
[0.8.1]: https://github.com/InferShield/infershield/compare/v0.7.0...v0.8.1
[0.7.0]: https://github.com/InferShield/infershield/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/InferShield/infershield/releases/tag/v0.6.0
