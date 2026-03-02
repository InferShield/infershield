# QA Test Plan: InferShield M1 v1.0 OAuth Device Flow

**Product ID:** prod_infershield_001  
**Epic:** E1 - OAuth Device Flow  
**Phase:** QA  
**Date:** 2026-03-02  
**Author:** QA Lead

---

## Executive Summary

This test plan covers quality assurance for InferShield's OAuth 2.0 Device Flow implementation (M1 v1.0). Per CEO mandate: **"M1 v1.0 OAuth release must be flawless. Quality over speed."**

**Prerequisites:** Phase 2+3 complete with 164 tests passing, CLI operational.

**Scope:** Functional, Security, UX, Regression, and Performance testing across Linux, macOS, and Windows.

---

## Test Objectives

1. **Functional Validation:** Verify OAuth device flow, CLI commands, and token lifecycle operate correctly
2. **Security Assurance:** Confirm secure token storage, proper authorization, and no exposure risks
3. **User Experience:** Validate CLI journey, error messaging, and documentation clarity
4. **Regression Protection:** Ensure existing functionality remains intact with backward compatibility
5. **Performance Baseline:** Measure device flow latency and identify bottlenecks

---

## Test Scope

### In-Scope
- OAuth 2.0 Device Flow (RFC 8628 compliance)
- CLI: `login`, `logout`, `status` commands
- Token lifecycle: acquisition, refresh, storage, expiration
- Cross-platform compatibility (Linux, macOS, Windows)
- Error handling and user feedback
- Documentation accuracy

### Out-of-Scope
- Browser-based OAuth flows (future epic)
- Multi-user/tenant scenarios (post-MVP)
- Load testing beyond single-user scenarios

---

## Test Cases

### **Functional Testing**

**TC-F01: Device Flow Initiation**  
- Verify `infershield login` triggers device authorization request
- Confirm user_code and verification_uri are displayed
- Validate device_code generation and storage

**TC-F02: Authorization Code Exchange**  
- Verify polling mechanism requests access_token
- Confirm successful token exchange on user authorization
- Validate error handling for expired/invalid codes

**TC-F03: Token Storage**  
- Verify tokens stored in secure OS-specific location
- Confirm file permissions restrict access (Linux/macOS: 0600)
- Validate token encryption at rest

**TC-F04: Token Refresh**  
- Verify automatic token refresh before expiration
- Confirm refresh_token usage and rotation
- Validate fallback to re-authentication on refresh failure

**TC-F05: CLI Status Command**  
- Verify `infershield status` displays authentication state
- Confirm token expiration time accuracy
- Validate output format consistency

**TC-F06: CLI Logout**  
- Verify `infershield logout` clears local tokens
- Confirm secure token deletion (overwrite + delete)
- Validate post-logout status shows unauthenticated state

### **Security Testing**

**TC-S01: Token Storage Security**  
- Verify tokens NOT stored in plaintext
- Confirm OS keychain integration (macOS/Windows) or encrypted storage (Linux)
- Test resistance to common file access attacks

**TC-S02: Authorization Scope Validation**  
- Verify only requested scopes are granted
- Confirm scope enforcement on API calls
- Test rejection of over-scoped requests

**TC-S03: Token Exposure Prevention**  
- Verify tokens NOT logged to console/files
- Confirm tokens NOT transmitted over insecure channels
- Validate token redaction in error messages

**TC-S04: Expired Token Handling**  
- Verify graceful expiration detection
- Confirm automatic refresh or re-authentication prompt
- Test no exposure of expired tokens

### **User Experience Testing**

**TC-UX01: First-Time Login Flow**  
- Verify clear instructions for device authorization
- Confirm intuitive step-by-step guidance
- Validate success confirmation message

**TC-UX02: Error Message Clarity**  
- Test network failure scenarios (clear, actionable messages)
- Test invalid token scenarios (helpful recovery guidance)
- Validate error code + human-readable explanation format

**TC-UX03: Documentation Accuracy**  
- Verify README setup instructions are accurate
- Confirm all CLI commands documented with examples
- Validate troubleshooting guide covers common issues

### **Regression Testing**

**TC-R01: Existing Functionality**  
- Verify all 164 existing tests continue to pass
- Confirm no breaking changes to public APIs
- Validate backward compatibility with previous CLI versions

**TC-R02: Configuration Compatibility**  
- Test upgrade path from pre-OAuth versions
- Verify existing config files remain valid
- Confirm graceful migration of legacy auth methods

### **Performance & Reliability**

**TC-P01: Device Flow Latency**  
- Measure time from `login` to token acquisition (target: <30s typical)
- Verify polling interval respects server rate limits
- Test timeout handling for slow authorization

**TC-P02: Network Resilience**  
- Test behavior under intermittent connectivity
- Verify retry logic with exponential backoff
- Confirm graceful degradation and recovery

---

## Pass/Fail Criteria

### **Pass Criteria**
- All 20 test cases execute without blocking defects
- Security tests show zero critical vulnerabilities
- Cross-platform tests succeed on Linux, macOS, Windows
- Performance: device flow completes within 30s (90th percentile)
- Documentation validated as accurate by UAT Lead

### **Fail Criteria**
- Any security vulnerability (token exposure, unauthorized access)
- CLI crashes or hangs during core workflows
- Data loss or corruption during token operations
- Platform-specific failures without documented workarounds

---

## Test Environment Requirements

### **Linux**
- Ubuntu 22.04 LTS, Fedora 39
- Node.js v18+ or packaged binary
- Network access to OAuth provider

### **macOS**
- macOS 13+ (Ventura, Sonoma)
- Xcode CLI tools
- Keychain access permissions

### **Windows**
- Windows 10/11 (64-bit)
- Windows Credential Manager access
- PowerShell 5.1+

### **Common Requirements**
- Clean install environment (no pre-existing tokens)
- Internet connectivity for OAuth flow
- Test OAuth provider with valid client credentials

---

## Timeline and Milestones

| Phase | Duration | Deliverable |
|-------|----------|-------------|
| Test Preparation | 1 day | Test environments provisioned, test data ready |
| Functional Testing | 2 days | TC-F01 through TC-F06 executed |
| Security Testing | 1 day | TC-S01 through TC-S04 executed |
| UX + Regression | 1 day | TC-UX01 through TC-R02 executed |
| Performance Testing | 1 day | TC-P01 through TC-P02 executed |
| Defect Resolution | 2 days | Critical/high issues fixed and retested |
| Final Sign-off | 0.5 day | Test report delivered to CEO |

**Total Estimated Duration:** 7.5 days

---

## Appendices

### **Reference Documentation**
- RFC 8628: OAuth 2.0 Device Authorization Grant
- InferShield OAuth Architecture (`e1_oauth_architecture.md`)
- CEO Mandate: Phase Entry Approval for QA

### **Test Automation**
- Existing 164 tests provide regression coverage
- Manual testing required for UX validation
- Recommend automation for smoke tests in CI/CD

### **Sign-off Authority**
- **QA Lead:** Test execution and defect reporting
- **UAT Lead:** User experience validation
- **CEO:** Final release approval

---

**Document Version:** 1.0  
**Last Updated:** 2026-03-02 19:45 UTC
