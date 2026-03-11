#!/usr/bin/env node
/**
 * Windows Environment Preflight Check
 * 
 * Validates that the host system meets requirements for running
 * InferShield Windows validation tests (Issue #77).
 * 
 * Run: node tests/windows/setup/check-environment.js
 */

'use strict';

const os = require('os');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const isWindows = process.platform === 'win32';

const checks = [];
let failures = 0;

function pass(label, detail = '') {
  checks.push({ status: 'PASS', label, detail });
  console.log(`  ✅ ${label}${detail ? ': ' + detail : ''}`);
}

function fail(label, detail = '') {
  checks.push({ status: 'FAIL', label, detail });
  console.error(`  ❌ ${label}${detail ? ': ' + detail : ''}`);
  failures++;
}

function warn(label, detail = '') {
  checks.push({ status: 'WARN', label, detail });
  console.warn(`  ⚠️  ${label}${detail ? ': ' + detail : ''}`);
}

function tryExec(cmd) {
  try {
    return execSync(cmd, { stdio: 'pipe' }).toString().trim();
  } catch (_) {
    return null;
  }
}

// ── Header ────────────────────────────────────────────────────────────────────
console.log('\n══════════════════════════════════════════════════════════════');
console.log('  InferShield — Windows 10/11 Environment Preflight (Issue #77)');
console.log('══════════════════════════════════════════════════════════════\n');

// ── 1. Platform ───────────────────────────────────────────────────────────────
console.log('[ Platform ]');
const platform = process.platform;
const arch = process.arch;
const release = os.release();
const type = os.type();

if (isWindows) {
  pass('Operating System', `Windows (${release})`);

  // Detect Win10 vs Win11 by build number
  const buildStr = tryExec('cmd /c ver');
  const buildMatch = buildStr && buildStr.match(/\d+\.\d+\.(\d+)/);
  const buildNum = buildMatch ? parseInt(buildMatch[1], 10) : 0;

  if (buildNum >= 22000) {
    pass('Windows Version', `Windows 11 (build ${buildNum})`);
  } else if (buildNum >= 19041) {
    pass('Windows Version', `Windows 10 (build ${buildNum})`);
  } else if (buildNum > 0) {
    fail('Windows Version', `Build ${buildNum} — Windows 10 20H1+ or Windows 11 required`);
  } else {
    warn('Windows Version', 'Could not determine build number');
  }
} else {
  warn('Operating System', `${type} (${platform} ${release}) — some tests will use mocks`);
}

console.log(`  ℹ️  Arch: ${arch}\n`);

// ── 2. Node.js ────────────────────────────────────────────────────────────────
console.log('[ Node.js ]');
const nodeVersion = process.version;
const major = parseInt(nodeVersion.slice(1), 10);
if (major >= 18) {
  pass('Node.js version', nodeVersion);
} else {
  fail('Node.js version', `${nodeVersion} — Node 18+ required`);
}

const npmOut = tryExec('npm --version');
if (npmOut) {
  pass('npm', `v${npmOut}`);
} else {
  fail('npm not found');
}
console.log();

// ── 3. Project Dependencies ───────────────────────────────────────────────────
console.log('[ Project Dependencies ]');
const rootModules = path.join(__dirname, '..', '..', '..', 'backend', 'node_modules');
if (fs.existsSync(rootModules)) {
  pass('backend/node_modules present');
} else {
  fail('backend/node_modules missing', 'Run: cd backend && npm install');
}

// Check keytar availability (Windows Credential Manager)
try {
  require('keytar');
  pass('keytar (Windows Credential Manager bridge)', 'available');
} catch (_) {
  warn('keytar not installed', 'Windows Credential Manager tests will use encrypted fallback');
}
console.log();

// ── 4. Chrome Extension Prerequisites ────────────────────────────────────────
console.log('[ Chrome Extension ]');
let chromeFound = false;
if (isWindows) {
  const chromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
  ];
  for (const p of chromePaths) {
    if (fs.existsSync(p)) {
      pass('Google Chrome', p);
      chromeFound = true;
      break;
    }
  }
  if (!chromeFound) warn('Google Chrome not found at standard paths');
} else {
  const ch = tryExec('which google-chrome || which chromium-browser || which chromium');
  if (ch) {
    pass('Chrome/Chromium', ch);
    chromeFound = true;
  } else {
    warn('Chrome/Chromium not found — Chrome extension tests will be skipped or mocked');
  }
}

const extDir = path.join(__dirname, '..', '..', '..', 'extension');
if (fs.existsSync(extDir)) {
  pass('Extension directory', extDir);
} else {
  fail('Extension directory not found', extDir);
}
console.log();

// ── 5. Docker (optional, for proxy service) ───────────────────────────────────
console.log('[ Docker (optional) ]');
const dockerOut = tryExec('docker --version');
if (dockerOut) {
  pass('Docker', dockerOut);
} else {
  warn('Docker not installed', 'Proxy service can be started with npm start instead');
}
console.log();

// ── 6. Environment Variables ──────────────────────────────────────────────────
console.log('[ Environment Variables ]');
if (process.env.INFERSHIELD_MASTER_KEY) {
  const keyLen = process.env.INFERSHIELD_MASTER_KEY.length;
  if (keyLen === 64) {
    pass('INFERSHIELD_MASTER_KEY', '64-char hex key set ✓');
  } else {
    fail('INFERSHIELD_MASTER_KEY', `Expected 64 hex chars, got ${keyLen}`);
  }
} else {
  warn('INFERSHIELD_MASTER_KEY not set', 'Encrypted fallback will use hostname-derived key (ephemeral)');
}
console.log();

// ── Summary ───────────────────────────────────────────────────────────────────
console.log('══════════════════════════════════════════════════════════════');
const total = checks.length;
const passed = checks.filter(c => c.status === 'PASS').length;
const warned = checks.filter(c => c.status === 'WARN').length;

console.log(`  Results: ${passed} passed, ${warned} warnings, ${failures} failures (${total} checks)`);

if (failures === 0) {
  console.log('  ✅ Environment ready for Windows validation tests.\n');
  process.exit(0);
} else {
  console.log('  ❌ Fix failures above before running validation tests.\n');
  process.exit(1);
}
