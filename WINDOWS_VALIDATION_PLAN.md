# Windows Platform Validation Plan
## InferShield M1 v1.0 OAuth Release - PREREQ-002

**Product ID:** prod_infershield_001  
**Validation Owner:** QA Lead  
**Deadline:** 2026-03-09 EOD (5 business days)  
**Status:** IN PROGRESS  

---

## Objective

Validate InferShield OAuth Device Flow implementation on Windows 10/11 platform to satisfy PREREQ-002 gate requirement before QA phase transition.

**CEO Mandate:** "M1 v1.0 OAuth release must be flawless. Quality over speed."

---

## Scope

### In Scope
- ✅ Token storage security model validation (Windows Credential Manager)
- ✅ Device Flow operational validation (browser launch, polling, callback)
- ✅ CLI commands validation (login, logout, status)
- ✅ Windows-specific compatibility testing

### Out of Scope
- ❌ Implementation changes or feature additions
- ❌ macOS/Linux validation (separate task)
- ❌ Performance benchmarking
- ❌ Security penetration testing

---

## Prerequisites

### Test Environment Requirements
- **OS:** Windows 10 (version 1909+) or Windows 11
- **Node.js:** v18.x or v20.x (LTS)
- **Git:** Git for Windows (for repository clone)
- **Network:** Internet connectivity for OAuth authorization
- **Permissions:** Administrator access for Credential Manager testing

### Reference Implementation
- **Phase 1 (Token Management):** commit `f0f86cd`, PR #76
- **Phase 2 (Device Flow):** commits `dd34808`, `023f61f`, `a119fa7`, `e93a382`, `082cde8`, `bd44671`
- **Phase 3 (CLI):** commit `7c2e830`

---

## Test Plan

### 1. Test Environment Setup

**Objective:** Establish Windows test environment

**Steps:**
1. Provision Windows 10/11 VM or physical machine
2. Install Node.js v18.x or v20.x
3. Clone InferShield repository
4. Install dependencies: `cd infershield/backend && npm install`
5. Verify CLI binary: `node backend/bin/infershield --version`

**Success Criteria:**
- Node.js installed and version verified
- Repository cloned successfully
- Dependencies installed without errors
- CLI executable and responds to --version

**Deliverable:** Environment specification document

---

### 2. Token Storage Validation

**Objective:** Validate secure token storage on Windows platform

#### 2.1 Keytar (Windows Credential Manager) Integration

**Test Case:** TC-WIN-001 - Keytar Availability  
**Priority:** HIGH  

**Steps:**
1. Check if `keytar` module loads successfully
2. Verify Windows Credential Manager is accessible
3. Confirm hardware-backed storage (if available)

**Expected Result:**
- `require('keytar')` succeeds without errors
- Windows Credential Manager accessible via keytar API

**Pass/Fail Criteria:**
- ✅ PASS: keytar loads, Credential Manager accessible
- ❌ FAIL: keytar fails to load OR Credential Manager inaccessible

---

**Test Case:** TC-WIN-002 - Token Write/Read/Delete (Keytar)  
**Priority:** HIGH  

**Steps:**
1. Initialize TokenStorage with keytar backend
2. Save test token: `saveToken('test-provider', { access_token: 'test123', ... })`
3. Retrieve token: `getToken('test-provider')`
4. Verify token data matches
5. Delete token: `deleteToken('test-provider')`
6. Verify token removed

**Expected Result:**
- Token saved to Windows Credential Manager
- Token retrieved successfully and data matches
- Token deleted successfully

**Pass/Fail Criteria:**
- ✅ PASS: All operations succeed, data integrity preserved
- ❌ FAIL: Any operation fails OR data corruption detected

---

**Test Case:** TC-WIN-003 - Token Persistence Across Sessions  
**Priority:** HIGH  

**Steps:**
1. Save token via CLI: `infershield auth login --provider test`
2. Exit Node.js process
3. Start new Node.js process
4. Retrieve token: `infershield auth status`
5. Verify token still present

**Expected Result:**
- Token persists after process restart
- Token data intact after restart

**Pass/Fail Criteria:**
- ✅ PASS: Token persists and data intact
- ❌ FAIL: Token lost after restart OR data corrupted

---

#### 2.2 Encrypted Fallback (AES-256-GCM)

**Test Case:** TC-WIN-004 - Fallback Activation  
**Priority:** MEDIUM  

**Steps:**
1. Simulate keytar unavailable (uninstall or mock failure)
2. Initialize TokenStorage
3. Verify fallback to encrypted file storage
4. Check file created at `~/.infershield/tokens/`

**Expected Result:**
- TokenStorage detects keytar unavailable
- Falls back to AES-256-GCM encrypted file storage
- Token directory created with secure permissions

**Pass/Fail Criteria:**
- ✅ PASS: Fallback activates, files created with secure permissions
- ❌ FAIL: Fallback fails OR insecure file permissions

---

**Test Case:** TC-WIN-005 - Encrypted File Permissions (Windows)  
**Priority:** HIGH  

**Steps:**
1. Save token in fallback mode
2. Check file permissions on Windows:
   ```powershell
   icacls ~\.infershield\tokens\provider_test.enc
   ```
3. Verify only current user has access (no group/everyone)

**Expected Result:**
- File permissions restrict access to current user only
- No read access for SYSTEM, Administrators group, or Everyone

**Pass/Fail Criteria:**
- ✅ PASS: File permissions = User-only (Windows ACLs)
- ❌ FAIL: File readable by other users/groups

---

**Test Case:** TC-WIN-006 - Encryption/Decryption Integrity  
**Priority:** HIGH  

**Steps:**
1. Save token in fallback mode
2. Read encrypted file directly (raw hex)
3. Verify ciphertext not readable as plaintext
4. Retrieve token via TokenStorage API
5. Verify decrypted data matches original

**Expected Result:**
- Encrypted file contains binary data (not plaintext)
- Decryption succeeds and data matches

**Pass/Fail Criteria:**
- ✅ PASS: Encryption prevents plaintext exposure, decryption succeeds
- ❌ FAIL: Plaintext visible in file OR decryption fails

---

### 3. Device Flow Validation

**Objective:** Validate OAuth Device Flow operational on Windows

#### 3.1 Browser Launch

**Test Case:** TC-WIN-007 - Browser Launch on Windows  
**Priority:** HIGH  

**Steps:**
1. Run CLI command: `infershield auth login --provider openai`
2. Observe device code output
3. Verify browser launches automatically (Windows default browser)
4. Check verification URL opens correctly

**Expected Result:**
- Device code displayed in console
- Browser launches automatically
- Verification URL opens in default browser (Edge, Chrome, Firefox)

**Pass/Fail Criteria:**
- ✅ PASS: Browser launches, URL loads
- ⚠️ PARTIAL: Browser launch fails but fallback instructions provided
- ❌ FAIL: No browser launch AND no fallback instructions

---

**Test Case:** TC-WIN-008 - Browser Launch Fallback  
**Priority:** MEDIUM  

**Steps:**
1. Simulate browser launch failure (mock `exec` failure)
2. Verify fallback instructions displayed
3. Manually open URL and authorize

**Expected Result:**
- Fallback message with URL and code displayed
- User can manually authorize via browser

**Pass/Fail Criteria:**
- ✅ PASS: Fallback instructions clear, manual authorization succeeds
- ❌ FAIL: No fallback instructions OR manual authorization fails

---

#### 3.2 Device Authorization Request

**Test Case:** TC-WIN-009 - Device Authorization Endpoint  
**Priority:** HIGH  

**Steps:**
1. Initiate device flow: `infershield auth login --provider openai`
2. Capture device authorization request
3. Verify response contains:
   - `device_code`
   - `user_code`
   - `verification_uri`
   - `expires_in`
   - `interval`

**Expected Result:**
- Authorization server returns valid device code response
- All required fields present

**Pass/Fail Criteria:**
- ✅ PASS: All required fields present, device code valid
- ❌ FAIL: Missing fields OR invalid device code

---

#### 3.3 Token Polling

**Test Case:** TC-WIN-010 - Token Polling with Backoff  
**Priority:** HIGH  

**Steps:**
1. Initiate device flow
2. Do NOT authorize immediately
3. Observe polling behavior:
   - Initial interval respected
   - Exponential backoff if rate-limited
4. Authorize in browser
5. Verify token received after authorization

**Expected Result:**
- Polling respects `interval` parameter
- Exponential backoff on rate limit (slow_down)
- Token received after user authorization

**Pass/Fail Criteria:**
- ✅ PASS: Polling respects interval, backoff works, token received
- ❌ FAIL: Polling too aggressive OR token not received after auth

---

**Test Case:** TC-WIN-011 - Authorization Timeout  
**Priority:** MEDIUM  

**Steps:**
1. Initiate device flow
2. Do NOT authorize
3. Wait for device code to expire (typically 15 minutes)
4. Verify CLI exits with timeout error

**Expected Result:**
- CLI waits for full expiry period
- Timeout error displayed after expiry
- Process exits gracefully

**Pass/Fail Criteria:**
- ✅ PASS: Timeout handled gracefully, error message clear
- ❌ FAIL: Process hangs OR no timeout error

---

#### 3.4 Authorization Callback Handling

**Test Case:** TC-WIN-012 - Authorization Success Callback  
**Priority:** HIGH  

**Steps:**
1. Initiate device flow
2. Authorize in browser
3. Verify CLI receives authorization success
4. Verify token stored securely
5. Verify success message displayed

**Expected Result:**
- Authorization callback processed
- Token stored in Windows Credential Manager (or fallback)
- CLI displays success message and exits

**Pass/Fail Criteria:**
- ✅ PASS: Callback processed, token stored, success message shown
- ❌ FAIL: Callback not processed OR token not stored

---

**Test Case:** TC-WIN-013 - Authorization Denial Callback  
**Priority:** MEDIUM  

**Steps:**
1. Initiate device flow
2. Deny authorization in browser
3. Verify CLI receives denial signal
4. Verify error message displayed
5. Verify process exits gracefully

**Expected Result:**
- Denial callback processed
- Error message displayed: "Authorization denied by user"
- Process exits with non-zero code

**Pass/Fail Criteria:**
- ✅ PASS: Denial handled gracefully, error message clear
- ❌ FAIL: Process hangs OR no error message

---

### 4. CLI Commands Validation

**Objective:** Validate CLI commands functional on Windows

#### 4.1 Login Command

**Test Case:** TC-WIN-014 - CLI Login Success Flow  
**Priority:** HIGH  

**Steps:**
1. Run: `infershield auth login --provider openai`
2. Authorize in browser
3. Verify token stored
4. Run: `infershield auth status`
5. Verify provider shows "Active"

**Expected Result:**
- Login command completes successfully
- Token stored and status shows active

**Pass/Fail Criteria:**
- ✅ PASS: Login succeeds, status shows active
- ❌ FAIL: Login fails OR status not updated

---

**Test Case:** TC-WIN-015 - CLI Login with --no-browser  
**Priority:** MEDIUM  

**Steps:**
1. Run: `infershield auth login --provider openai --no-browser`
2. Verify browser NOT launched
3. Verify manual instructions displayed
4. Manually open URL and authorize
5. Verify token stored

**Expected Result:**
- Browser not launched
- Manual instructions clear
- Token stored after manual authorization

**Pass/Fail Criteria:**
- ✅ PASS: Manual flow works, token stored
- ❌ FAIL: Manual flow fails OR token not stored

---

#### 4.2 Logout Command

**Test Case:** TC-WIN-016 - CLI Logout Single Provider  
**Priority:** HIGH  

**Steps:**
1. Login: `infershield auth login --provider openai`
2. Logout: `infershield auth logout --provider openai`
3. Verify token removed from storage
4. Run: `infershield auth status`
5. Verify provider no longer listed

**Expected Result:**
- Token removed from Windows Credential Manager
- Status command shows no active sessions

**Pass/Fail Criteria:**
- ✅ PASS: Token removed, status updated
- ❌ FAIL: Token still present after logout

---

**Test Case:** TC-WIN-017 - CLI Logout All Providers  
**Priority:** MEDIUM  

**Steps:**
1. Login to multiple providers:
   - `infershield auth login --provider openai`
   - `infershield auth login --provider github`
2. Logout all: `infershield auth logout --all`
3. Verify all tokens removed
4. Run: `infershield auth status`
5. Verify no active sessions

**Expected Result:**
- All tokens removed from storage
- Status shows "No active sessions"

**Pass/Fail Criteria:**
- ✅ PASS: All tokens removed, status clear
- ❌ FAIL: Any token remains after logout --all

---

#### 4.3 Status Command

**Test Case:** TC-WIN-018 - CLI Status Display  
**Priority:** HIGH  

**Steps:**
1. Login: `infershield auth login --provider openai`
2. Run: `infershield auth status`
3. Verify output contains:
   - Provider name
   - Scope
   - Status (Active/Expired)
   - Expiration timestamp
   - Time remaining

**Expected Result:**
- Status output formatted correctly
- All fields present and accurate

**Pass/Fail Criteria:**
- ✅ PASS: Status display correct, all fields present
- ❌ FAIL: Missing fields OR incorrect data

---

**Test Case:** TC-WIN-019 - CLI Status JSON Output  
**Priority:** LOW  

**Steps:**
1. Login: `infershield auth login --provider openai`
2. Run: `infershield auth status --json`
3. Verify JSON output parseable
4. Verify JSON contains expected fields

**Expected Result:**
- JSON output valid and parseable
- Contains all status fields

**Pass/Fail Criteria:**
- ✅ PASS: JSON valid, fields correct
- ❌ FAIL: JSON invalid OR missing fields

---

### 5. Windows-Specific Edge Cases

**Test Case:** TC-WIN-020 - PowerShell Execution  
**Priority:** HIGH  

**Steps:**
1. Open PowerShell (not PowerShell Core)
2. Run: `node backend/bin/infershield auth login --provider openai`
3. Verify CLI works in PowerShell
4. Authorize and verify token stored

**Expected Result:**
- CLI works in Windows PowerShell
- All output displayed correctly

**Pass/Fail Criteria:**
- ✅ PASS: CLI functional in PowerShell
- ❌ FAIL: CLI fails or output corrupted

---

**Test Case:** TC-WIN-021 - Path with Spaces  
**Priority:** MEDIUM  

**Steps:**
1. Clone repository to path with spaces: `C:\Program Files\InferShield\`
2. Run CLI commands from that path
3. Verify token storage works with spaces in path

**Expected Result:**
- CLI works from path with spaces
- Token storage path handling correct

**Pass/Fail Criteria:**
- ✅ PASS: No path-related errors
- ❌ FAIL: Path errors or token storage fails

---

**Test Case:** TC-WIN-022 - Windows Line Endings (CRLF)  
**Priority:** LOW  

**Steps:**
1. Verify repository files have CRLF line endings (Windows default)
2. Run CLI commands
3. Verify no line ending related errors

**Expected Result:**
- CLI handles CRLF line endings correctly
- No parsing errors

**Pass/Fail Criteria:**
- ✅ PASS: No line ending errors
- ❌ FAIL: Parse errors due to CRLF

---

## Test Execution Schedule

| Day | Tasks | Owner |
|-----|-------|-------|
| **Day 1** (Mon) | Environment setup (TC-WIN-001) | QA Lead |
| **Day 2** (Tue) | Token storage validation (TC-WIN-002 to TC-WIN-006) | QA Lead |
| **Day 3** (Wed) | Device flow validation (TC-WIN-007 to TC-WIN-013) | QA Lead |
| **Day 4** (Thu) | CLI commands validation (TC-WIN-014 to TC-WIN-019) | QA Lead |
| **Day 5** (Fri) | Edge cases + report generation (TC-WIN-020 to TC-WIN-022) | QA Lead |

---

## Risk Assessment

### High-Risk Areas
1. **Windows Credential Manager Integration (keytar)**
   - Risk: keytar binary may not support all Windows versions
   - Mitigation: Fallback to encrypted file storage tested

2. **Browser Launch on Windows**
   - Risk: Different default browsers may behave differently
   - Mitigation: Test with Edge, Chrome, Firefox

3. **File Permissions (Windows ACLs)**
   - Risk: Windows ACL model differs from Unix permissions
   - Mitigation: Use icacls to verify user-only access

### Medium-Risk Areas
1. **PowerShell vs CMD compatibility**
   - Risk: Command syntax differs between shells
   - Mitigation: Test in both PowerShell and CMD

2. **Path handling (backslashes, spaces)**
   - Risk: Windows path separators differ from Unix
   - Mitigation: Test with paths containing spaces and special chars

---

## Success Criteria

### GREEN Status Requirements
- ✅ All HIGH priority test cases: PASS
- ✅ At least 80% of MEDIUM priority test cases: PASS
- ✅ No CRITICAL or BLOCKER issues discovered
- ✅ Token storage secure on Windows (Credential Manager or fallback)
- ✅ Device flow operational on Windows
- ✅ CLI commands functional on Windows

### RED Status Triggers
- ❌ Any HIGH priority test case: FAIL
- ❌ Token storage insecure (plaintext tokens)
- ❌ Device flow non-functional
- ❌ CLI commands crash or hang

---

## Deliverables

1. **Windows Validation Report** (this document, updated with results)
2. **Test Execution Log** (detailed pass/fail results)
3. **Windows-Specific Issues List** (if any discovered)
4. **GREEN/RED Status Decision** (final gate assessment)

---

## Report Commit

Upon completion, this report will be committed to the InferShield repository with final status and test results.

**Commit Message Format:**
```
qa(windows): PREREQ-002 validation complete - [GREEN/RED] status

- Test environment: Windows 10/11, Node.js vX.X.X
- Token storage: [PASS/FAIL]
- Device flow: [PASS/FAIL]
- CLI commands: [PASS/FAIL]
- Overall status: [GREEN/RED]
```

---

**Document Version:** 1.0  
**Created:** 2026-03-02  
**Last Updated:** 2026-03-02  
**Status:** DRAFT (validation in progress)
