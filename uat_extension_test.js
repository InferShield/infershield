#!/usr/bin/env node
/**
 * InferShield Chrome Extension UAT Test Runner
 * Component 2: Threat Detection & Popup Alerts
 * 
 * This script automates UAT testing for the InferShield Chrome Extension
 */

const path = require('path');

// Test Results
const results = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function log(level, message) {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${level}] ${message}`);
}

function recordTest(id, name, status, details = '') {
  results.total++;
  results[status]++;
  results.tests.push({ id, name, status, details, timestamp: new Date().toISOString() });
  log(status.toUpperCase(), `${id}: ${name} - ${status.toUpperCase()} ${details ? '- ' + details : ''}`);
}

// Test Configuration
const TEST_CONFIG = {
  extensionPath: path.resolve(__dirname, 'extension'),
  backendUrl: 'http://localhost:5000',
  testApiKey: 'test-key-uat-12345',
  timeout: 10000
};

log('INFO', '========================================');
log('INFO', 'InferShield Extension UAT Test Runner');
log('INFO', 'Component 2: Threat Detection & Popup Alerts');
log('INFO', '========================================');
log('INFO', `Extension Path: ${TEST_CONFIG.extensionPath}`);
log('INFO', `Backend URL: ${TEST_CONFIG.backendUrl}`);
log('INFO', '');

// ==================================
// Manual Testing Guidance
// ==================================

log('INFO', '📋 UAT Test Execution Plan');
log('INFO', '');
log('INFO', 'This UAT requires manual testing with the Chrome extension loaded.');
log('INFO', 'Automated browser testing with extensions has limitations.');
log('INFO', '');

log('INFO', '🔧 Setup Instructions:');
log('INFO', '1. Open Chrome/Chromium browser');
log('INFO', '2. Navigate to: chrome://extensions');
log('INFO', '3. Enable "Developer mode" (top right toggle)');
log('INFO', '4. Click "Load unpacked"');
log('INFO', `5. Select folder: ${TEST_CONFIG.extensionPath}`);
log('INFO', '6. Extension icon should appear in toolbar');
log('INFO', '');

log('INFO', '⚙️ Configure Extension:');
log('INFO', '1. Click InferShield extension icon');
log('INFO', `2. API Endpoint: ${TEST_CONFIG.backendUrl}`);
log('INFO', `3. API Key: ${TEST_CONFIG.testApiKey}`);
log('INFO', '4. Protection Mode: Warn (recommended)');
log('INFO', '5. Enable all sites (ChatGPT, Claude, Gemini, GitHub)');
log('INFO', '6. Click "Save Settings"');
log('INFO', '7. Verify "Settings saved successfully" message');
log('INFO', '');

// ==================================
// Test Case Definitions
// ==================================

const TEST_CASES = [
  {
    id: 'TC-UAT-001',
    name: 'API Key Detection (OpenAI)',
    severity: 'CRITICAL',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: `Please analyze this code:\nconst client = new OpenAI({ apiKey: 'sk-proj-1234567890abcdef1234567890abcdef1234567890abcdef' });`,
    expectedThreats: ['API_KEY_OPENAI'],
    expectedRiskMin: 70,
    instructions: [
      'Navigate to https://chat.openai.com',
      'Type the test input in the chat box',
      'Press Enter or click Send button',
      '✅ PASS: Modal appears with threat warning',
      '✅ PASS: Risk score shows 70+',
      '✅ PASS: "OpenAI API Key" pattern detected',
      '✅ PASS: Action buttons visible (Cancel, Redact & Send, Send Anyway)',
      '❌ FAIL: If no modal appears or incorrect threat detected'
    ]
  },
  {
    id: 'TC-UAT-002',
    name: 'Email Address Detection',
    severity: 'MEDIUM',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'Contact me at john.doe@company.com for more details.',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Type the test input',
      'Attempt to send',
      '✅ PASS: Modal appears with email detection',
      '✅ PASS: Risk score 40-60',
      '❌ FAIL: If no detection or incorrect severity'
    ]
  },
  {
    id: 'TC-UAT-003',
    name: 'Social Security Number Detection',
    severity: 'CRITICAL',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'My SSN is 123-45-6789, please verify my identity.',
    expectedThreats: ['SSN_US'],
    expectedRiskMin: 90,
    instructions: [
      'Type the test input',
      'Attempt to send',
      '✅ PASS: Modal appears with SSN threat (CRITICAL)',
      '✅ PASS: Risk score 90+',
      '❌ FAIL: If SSN not detected'
    ]
  },
  {
    id: 'TC-UAT-004',
    name: 'Credit Card Number Detection',
    severity: 'CRITICAL',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'Card: 4532 1488 0343 6467, exp 12/25, CVV 123',
    expectedThreats: ['CREDIT_CARD'],
    expectedRiskMin: 90,
    instructions: [
      'Type the test input',
      'Attempt to send',
      '✅ PASS: Modal appears with credit card threat',
      '✅ PASS: Risk score 90+',
      '❌ FAIL: If credit card not detected'
    ]
  },
  {
    id: 'TC-UAT-005',
    name: 'Multiple Threats Detection',
    severity: 'HIGH',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: `Hi, I'm debugging an issue. Here's my info:\n- Email: admin@example.com\n- API Key: sk-1234567890abcdef\n- Phone: (555) 123-4567\n- IP: 192.168.1.100`,
    expectedThreats: ['EMAIL_ADDRESS', 'API_KEY', 'PHONE_US', 'IP_ADDRESS'],
    expectedRiskMin: 80,
    instructions: [
      'Type the test input with multiple threats',
      'Attempt to send',
      '✅ PASS: Modal shows ALL detected threats (4+)',
      '✅ PASS: Risk score 80+',
      '✅ PASS: Threat list is scrollable if needed',
      '❌ FAIL: If any threat is missed'
    ]
  },
  {
    id: 'TC-UAT-006',
    name: 'Safe Message (No Threats)',
    severity: 'BLOCKER',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: "What's the best way to implement authentication in a Node.js app?",
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Type a safe, normal message',
      'Press Enter',
      '✅ PASS: No modal appears',
      '✅ PASS: Message sends immediately',
      '❌ FAIL: If modal appears for safe content (false positive)'
    ]
  },
  {
    id: 'TC-UAT-007',
    name: 'Modal Clarity - Threat Information',
    severity: 'HIGH',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: `const key = "sk-test-abcdef123456789012345678901234567890abcd";`,
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 70,
    instructions: [
      'Trigger a threat detection',
      '✅ PASS: Modal has clear warning icon (⚠️)',
      '✅ PASS: Risk score is prominently displayed',
      '✅ PASS: Risk score has color coding (red for high risk)',
      '✅ PASS: Threat list shows severity badges',
      '✅ PASS: Pattern names are readable (not technical jargon)',
      '✅ PASS: Matched text snippets shown',
      '✅ PASS: Typography is legible (good font sizes)',
      '❌ FAIL: If modal is unclear or hard to read'
    ]
  },
  {
    id: 'TC-UAT-008',
    name: 'Modal Actions - User Choice',
    severity: 'BLOCKER',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'Email: test@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Trigger threat detection',
      'Test 1: Click "Cancel" button',
      '  ✅ PASS: Modal closes, message NOT sent',
      'Test 2: Type message again, click "Redact & Send"',
      '  ✅ PASS: Message redacted (email replaced with [REDACTED])',
      '  ✅ PASS: Redacted message sent to chat',
      'Test 3: Type message again, click "Send Anyway"',
      '  ✅ PASS: Original message sent (with user acknowledgment)',
      '  ✅ PASS: No modal reappears (no infinite loop)',
      '❌ FAIL: If any button doesn\'t work correctly'
    ]
  },
  {
    id: 'TC-UAT-009',
    name: 'Redaction Accuracy',
    severity: 'HIGH',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: `Please analyze: const client = new OpenAI({ apiKey: 'sk-test-abcd1234' });`,
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 70,
    instructions: [
      'Trigger detection',
      'Click "Redact & Send"',
      '✅ PASS: API key replaced with [REDACTED_API_KEY] or similar',
      '✅ PASS: Rest of message preserved',
      '✅ PASS: Message still makes sense',
      '✅ PASS: Redacted message actually sent to ChatGPT',
      '❌ FAIL: If redaction is incomplete or over-redacts'
    ]
  },
  {
    id: 'TC-UAT-010',
    name: 'Modal Responsiveness',
    severity: 'MEDIUM',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'My email is test@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Trigger detection at different screen sizes',
      'Test on: 1920x1080, 1366x768, 1024x768',
      '✅ PASS: Modal is always centered',
      '✅ PASS: No horizontal scroll needed',
      '✅ PASS: All buttons accessible',
      '✅ PASS: Text doesn\'t overflow',
      '❌ FAIL: If modal breaks at any resolution'
    ]
  },
  {
    id: 'TC-UAT-011',
    name: 'ChatGPT Integration',
    severity: 'BLOCKER',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'sk-test-1234567890abcdef',
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 70,
    instructions: [
      'Navigate to https://chat.openai.com',
      'Login if needed',
      'Type test input with API key',
      'Test with Enter key',
      '  ✅ PASS: Modal intercepts send',
      'Test with Send button click',
      '  ✅ PASS: Modal intercepts send',
      '❌ FAIL: If extension doesn\'t intercept on ChatGPT'
    ]
  },
  {
    id: 'TC-UAT-012',
    name: 'Claude Integration',
    severity: 'BLOCKER',
    platform: 'Claude',
    url: 'https://claude.ai',
    input: 'sk-ant-api123456789012345678901234567890',
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 70,
    instructions: [
      'Navigate to https://claude.ai',
      'Login if needed',
      'Type test input with API key',
      '✅ PASS: Extension intercepts send on Claude',
      '✅ PASS: Modal appears correctly',
      '❌ FAIL: If no interception on Claude'
    ]
  },
  {
    id: 'TC-UAT-013',
    name: 'Gemini Integration',
    severity: 'HIGH',
    platform: 'Gemini',
    url: 'https://gemini.google.com',
    input: 'my-secret-key-abc123def456',
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 60,
    instructions: [
      'Navigate to https://gemini.google.com',
      'Login with Google account',
      'Type test input',
      '✅ PASS: Extension intercepts send on Gemini',
      '✅ PASS: Modal appears',
      '❌ FAIL: If no interception on Gemini'
    ]
  },
  {
    id: 'TC-UAT-014',
    name: 'GitHub Copilot Integration',
    severity: 'MEDIUM',
    platform: 'GitHub Copilot',
    url: 'https://github.com',
    input: 'ghp_abcdef1234567890ABCDEF1234567890abcd',
    expectedThreats: ['API_KEY', 'GITHUB_TOKEN'],
    expectedRiskMin: 80,
    instructions: [
      'Navigate to https://github.com',
      'Access Copilot chat interface',
      'Type test input with GitHub token',
      '✅ PASS: Extension intercepts on GitHub',
      '✅ PASS: Modal appears',
      '⚠️ SKIP: If Copilot chat not available in free tier'
    ]
  },
  {
    id: 'TC-UAT-015',
    name: 'Extension Popup Configuration',
    severity: 'BLOCKER',
    platform: 'Extension',
    url: 'chrome://extensions',
    input: null,
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Click InferShield extension icon in toolbar',
      '✅ PASS: Popup opens (400px wide, dark theme)',
      '✅ PASS: API Endpoint input visible',
      '✅ PASS: API Key input visible (masked)',
      '✅ PASS: Protection Mode dropdown visible (Warn/Block)',
      '✅ PASS: Site toggles visible (ChatGPT, Claude, Gemini, GitHub)',
      '✅ PASS: Master enable/disable switch visible',
      '✅ PASS: Save button visible',
      'Enter config values and click Save',
      '✅ PASS: Success message appears',
      '✅ PASS: Settings persist after closing popup',
      '❌ FAIL: If popup doesn\'t open or fields missing'
    ]
  },
  {
    id: 'TC-UAT-016',
    name: 'Site-Specific Enable/Disable',
    severity: 'MEDIUM',
    platform: 'Extension',
    url: 'chrome://extensions',
    input: 'test@example.com',
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Open extension popup',
      'Disable ChatGPT toggle',
      'Save settings',
      'Navigate to https://chat.openai.com',
      'Type message with email (threat)',
      '✅ PASS: No modal appears (extension disabled for site)',
      '✅ PASS: Message sends normally',
      'Re-enable ChatGPT in settings',
      '✅ PASS: Protection resumes',
      '❌ FAIL: If site-specific disable doesn\'t work'
    ]
  },
  {
    id: 'TC-UAT-017',
    name: 'Protection Mode - Warn vs Block',
    severity: 'HIGH',
    platform: 'Extension',
    url: 'https://chat.openai.com',
    input: 'sk-test-abcdef123456',
    expectedThreats: ['API_KEY'],
    expectedRiskMin: 70,
    instructions: [
      'Set mode to "Warn" in popup',
      'Trigger threat on ChatGPT',
      '✅ PASS: Modal shows all 3 buttons (Cancel, Redact, Send Anyway)',
      'Set mode to "Block" in popup',
      'Trigger threat again',
      '✅ PASS: Modal shows only 2 buttons (Cancel, Redact)',
      '✅ PASS: "Send Anyway" button NOT visible in Block mode',
      '❌ FAIL: If mode doesn\'t affect button visibility'
    ]
  },
  {
    id: 'TC-UAT-018',
    name: 'Backend Unavailable',
    severity: 'BLOCKER',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test@example.com',
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      '⚠️ SETUP: Stop the backend server (npm stop)',
      'Navigate to ChatGPT',
      'Type message with threat',
      'Attempt to send',
      '✅ PASS: Error modal appears',
      '✅ PASS: Error message: "Backend unavailable" or "Network error"',
      '✅ PASS: Message is NOT sent (fail-safe)',
      '✅ PASS: User can still cancel',
      '⚠️ TEARDOWN: Restart backend (npm start)',
      '❌ FAIL: If message sends when backend is down'
    ]
  },
  {
    id: 'TC-UAT-019',
    name: 'Invalid API Key',
    severity: 'HIGH',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test@example.com',
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Open extension popup',
      'Set API Key to: invalid-key-12345',
      'Save settings',
      'Navigate to ChatGPT',
      'Type message with threat',
      'Attempt to send',
      '✅ PASS: Error modal appears',
      '✅ PASS: Error indicates auth/API key issue',
      '✅ PASS: Message not sent',
      '⚠️ TEARDOWN: Restore valid API key',
      '❌ FAIL: If no error shown for invalid key'
    ]
  },
  {
    id: 'TC-UAT-020',
    name: 'Empty Message Send',
    severity: 'LOW',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: '',
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Navigate to ChatGPT',
      'Leave message box empty',
      'Press Enter',
      '✅ PASS: Extension does NOT intercept (no content to scan)',
      '✅ PASS: ChatGPT handles empty send normally',
      '❌ FAIL: If extension blocks empty messages'
    ]
  },
  {
    id: 'TC-UAT-021',
    name: 'Very Long Message',
    severity: 'MEDIUM',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit... [5000+ chars] ...email: test@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Compose a 5000+ character message',
      'Include an email near the end',
      'Attempt to send',
      '✅ PASS: Extension scans successfully',
      '✅ PASS: Modal appears with email detection',
      '✅ PASS: Threat list is scrollable',
      '✅ PASS: No performance lag',
      '❌ FAIL: If extension crashes or hangs'
    ]
  },
  {
    id: 'TC-UAT-022',
    name: 'Special Characters & Encoding',
    severity: 'LOW',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: '🔑 API Key: sk-test-😎-abcdef123456 ✨\nContact: josé@example.com 🚀',
    expectedThreats: ['API_KEY', 'EMAIL_ADDRESS'],
    expectedRiskMin: 60,
    instructions: [
      'Type message with emojis, unicode, accented chars',
      'Attempt to send',
      '✅ PASS: Extension handles gracefully',
      '✅ PASS: Threats detected despite special chars',
      '✅ PASS: Modal displays correctly',
      '❌ FAIL: If extension crashes or mangles text'
    ]
  },
  {
    id: 'TC-UAT-023',
    name: 'Rapid Send Prevention (Bypass Flag)',
    severity: 'HIGH',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Type message with threat',
      'Click "Redact & Send"',
      '✅ PASS: Redacted message sent ONCE',
      '✅ PASS: No second modal appears',
      '✅ PASS: No infinite loop',
      '✅ PASS: bypassNextScan flag works correctly',
      'Check browser console for logs',
      '❌ FAIL: If modal appears twice or infinite loop'
    ]
  },
  {
    id: 'TC-UAT-024',
    name: 'Scan Latency',
    severity: 'MEDIUM',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Type message with threat',
      'Press Enter',
      'Measure time from Enter press to modal appearance',
      '✅ PASS: Modal appears within 500ms',
      '✅ PASS: "Scanning..." indicator shown briefly',
      '✅ PASS: No noticeable delay',
      '❌ FAIL: If scan takes > 1 second'
    ]
  },
  {
    id: 'TC-UAT-025',
    name: 'Extension Reload Recovery',
    severity: 'MEDIUM',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test@example.com',
    expectedThreats: [],
    expectedRiskMin: 0,
    instructions: [
      'Navigate to ChatGPT (keep tab open)',
      'Go to chrome://extensions',
      'Click "Reload" on InferShield extension',
      'Return to ChatGPT tab (DO NOT reload page)',
      'Type message with threat',
      'Attempt to send',
      '✅ PASS: Error modal appears',
      '✅ PASS: Message: "Extension was updated, please reload page"',
      '✅ PASS: Message NOT sent (fail-safe)',
      'Reload ChatGPT page',
      '✅ PASS: Extension works normally again',
      '❌ FAIL: If no error or message sends'
    ]
  },
  {
    id: 'TC-UAT-026',
    name: 'Multiple Tab Support',
    severity: 'LOW',
    platform: 'ChatGPT',
    url: 'https://chat.openai.com',
    input: 'test1@example.com, test2@example.com, test3@example.com',
    expectedThreats: ['EMAIL_ADDRESS'],
    expectedRiskMin: 40,
    instructions: [
      'Open 3 tabs with ChatGPT',
      'Tab 1: Type message with threat, send',
      '✅ PASS: Modal appears in Tab 1',
      'Tab 2: Type different message with threat, send',
      '✅ PASS: Modal appears in Tab 2 (independent)',
      'Tab 3: Type safe message, send',
      '✅ PASS: No modal in Tab 3',
      '✅ PASS: No state collision between tabs',
      '❌ FAIL: If tabs interfere with each other'
    ]
  }
];

// ==================================
// Print Test Cases
// ==================================

log('INFO', '');
log('INFO', '📝 Test Case Execution Checklist');
log('INFO', '=====================================');
log('INFO', '');

const criticalTests = TEST_CASES.filter(t => t.severity === 'BLOCKER' || t.severity === 'CRITICAL');
const highTests = TEST_CASES.filter(t => t.severity === 'HIGH');
const mediumTests = TEST_CASES.filter(t => t.severity === 'MEDIUM');
const lowTests = TEST_CASES.filter(t => t.severity === 'LOW');

log('INFO', `🔴 BLOCKER/CRITICAL Tests (${criticalTests.length}):`);
criticalTests.forEach((tc, i) => {
  log('INFO', `  ${i + 1}. ${tc.id}: ${tc.name} [${tc.severity}]`);
});
log('INFO', '');

log('INFO', `🟠 HIGH Priority Tests (${highTests.length}):`);
highTests.forEach((tc, i) => {
  log('INFO', `  ${i + 1}. ${tc.id}: ${tc.name} [${tc.severity}]`);
});
log('INFO', '');

log('INFO', `🟡 MEDIUM Priority Tests (${mediumTests.length}):`);
mediumTests.forEach((tc, i) => {
  log('INFO', `  ${i + 1}. ${tc.id}: ${tc.name} [${tc.severity}]`);
});
log('INFO', '');

log('INFO', `🟢 LOW Priority Tests (${lowTests.length}):`);
lowTests.forEach((tc, i) => {
  log('INFO', `  ${i + 1}. ${tc.id}: ${tc.name} [${tc.severity}]`);
});
log('INFO', '');

// ==================================
// Detailed Test Instructions
// ==================================

log('INFO', '');
log('INFO', '📖 Detailed Test Instructions');
log('INFO', '=====================================');
log('INFO', '');

TEST_CASES.forEach((tc, index) => {
  log('INFO', '');
  log('INFO', `─────────────────────────────────────`);
  log('INFO', `Test ${index + 1}/${TEST_CASES.length}: ${tc.id}`);
  log('INFO', `Name: ${tc.name}`);
  log('INFO', `Severity: ${tc.severity}`);
  log('INFO', `Platform: ${tc.platform}`);
  if (tc.url) log('INFO', `URL: ${tc.url}`);
  if (tc.input) {
    log('INFO', `Test Input:`);
    log('INFO', `  ${tc.input.substring(0, 100)}${tc.input.length > 100 ? '...' : ''}`);
  }
  if (tc.expectedThreats.length > 0) {
    log('INFO', `Expected Threats: ${tc.expectedThreats.join(', ')}`);
    log('INFO', `Expected Min Risk Score: ${tc.expectedRiskMin}`);
  }
  log('INFO', `Steps:`);
  tc.instructions.forEach((step, i) => {
    log('INFO', `  ${i + 1}. ${step}`);
  });
  log('INFO', `─────────────────────────────────────`);
});

// ==================================
// Generate Test Report Template
// ==================================

log('INFO', '');
log('INFO', '');
log('INFO', '📊 Test Results Recording Template');
log('INFO', '=====================================');
log('INFO', '');
log('INFO', 'After executing each test manually, record results here:');
log('INFO', '');

console.log('');
console.log('### UAT Execution Results');
console.log('');
console.log('**Date:** [FILL IN]');
console.log('**Tester:** [UAT Lead]');
console.log('**Extension Version:** 0.8.1');
console.log('**Backend Version:** [FILL IN]');
console.log('**Browser:** Chrome/Chromium [VERSION]');
console.log('');
console.log('#### Test Results');
console.log('');
console.log('| Test ID | Test Name | Status | Notes |');
console.log('|---------|-----------|--------|-------|');
TEST_CASES.forEach(tc => {
  console.log(`| ${tc.id} | ${tc.name} | [ ] PASS / [ ] FAIL / [ ] SKIP | |`);
});
console.log('');
console.log('#### Summary');
console.log('- **Total Tests:** ' + TEST_CASES.length);
console.log('- **Passed:** [FILL IN]');
console.log('- **Failed:** [FILL IN]');
console.log('- **Skipped:** [FILL IN]');
console.log('- **Pass Rate:** [FILL IN]%');
console.log('');
console.log('#### Critical Findings');
console.log('1. [Issue 1]');
console.log('2. [Issue 2]');
console.log('');
console.log('#### Recommendations');
console.log('- [Recommendation 1]');
console.log('- [Recommendation 2]');
console.log('');
console.log('#### Sign-off');
console.log('- [ ] UAT Lead Approval');
console.log('- [ ] Product Owner Approval');
console.log('- [ ] CEO Approval (for release gate)');
console.log('');

log('INFO', '');
log('INFO', '✅ UAT Test Runner Complete');
log('INFO', '');
log('INFO', 'Next Steps:');
log('INFO', '1. Execute tests manually following the instructions above');
log('INFO', '2. Record results in the template');
log('INFO', '3. Document any issues or defects');
log('INFO', '4. Generate final UAT report');
log('INFO', '5. Submit for stakeholder approval');
log('INFO', '');
log('INFO', 'Good luck with testing! 🚀');
log('INFO', '');

process.exit(0);
