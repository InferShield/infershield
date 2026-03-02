#!/usr/bin/env node

/**
 * Tenant Isolation Audit Script
 * 
 * Scans backend code for database queries that may lack proper tenant scoping.
 * This helps prevent cross-tenant data leakage by identifying queries that don't
 * filter by user_id when they should.
 * 
 * Usage: node scripts/audit-tenant-isolation.js
 */

const fs = require('fs');
const path = require('path');

// Tables that require tenant scoping (must include user_id in WHERE clause)
const TENANT_TABLES = [
  'audit_logs',
  'api_keys',
  'usage_records',
  'policies',
  'compliance_reports',
  'report_schedules',
  'report_templates',
  'security_audit_logs'
];

// Known safe patterns (whitelist) - these are intentionally not tenant-scoped
const SAFE_PATTERNS = [
  // Webhook handlers: lookup by stripe_customer_id is correct
  { file: 'routes/webhooks.js', reason: 'Webhook handlers lookup users by stripe_customer_id (correct behavior)' },
  
  // Auth service: login/registration queries can't be scoped by user_id (user doesn't exist yet or isn't authenticated)
  { file: 'services/auth-service.js', pattern: /where.*email.*login|register|\.where\(\{\s*email/, reason: 'Auth queries lookup by email (pre-authentication)' },
  
  // API key validation: runs BEFORE authentication to determine which user owns a key
  // The validateKey() function at line 65 looks up api_keys by key_prefix to determine ownership
  // This is correct behavior - it CANNOT scope by user_id because resolving user identity is its purpose
  { file: 'services/api-key-service.js', pattern: /validateKey|where.*key_prefix|Find potential keys/, reason: 'API key validation (pre-authentication lookup)' },
  
  // Seed files: dev/test data population, never runs in production
  { file: 'database/seeds/', reason: 'Seed scripts are dev/test only' },
  
  // Migration files: schema changes, not data queries
  { file: 'database/migrations/', reason: 'Migrations are schema operations, not data queries' },
  
  // Admin operations: explicitly marked with adminQuery()
  { file: '', pattern: /adminQuery\(/, reason: 'Explicitly using adminQuery for admin operations' },
  
  // Tenant-scoped comments: queries marked as explicitly tenant-scoped
  { file: '', pattern: /\/\/\s*TENANT-SCOPED/, reason: 'Query is marked as tenant-scoped by developer' }
];

// Risk scoring weights
const RISK_WEIGHTS = {
  audit_logs: 25,
  api_keys: 20,
  usage_records: 15,
  policies: 15,
  compliance_reports: 10,
  report_schedules: 5,
  report_templates: 5,
  security_audit_logs: 5
};

let violations = [];
let totalRiskScore = 0;

/**
 * Check if a violation matches a safe pattern
 */
function isSafePattern(filePath, line, lineNumber) {
  for (const safe of SAFE_PATTERNS) {
    // Check file path match
    if (safe.file && filePath.includes(safe.file)) {
      return { safe: true, reason: safe.reason };
    }
    
    // Check pattern match
    if (safe.pattern && safe.pattern.test(line)) {
      return { safe: true, reason: safe.reason };
    }
  }
  return { safe: false };
}

/**
 * Scan a file for potential tenant isolation violations
 */
function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, index) => {
    const lineNumber = index + 1;
    
    // Check for database queries on tenant tables
    TENANT_TABLES.forEach(table => {
      // Match: db('table_name') or db("table_name")
      const dbQueryPattern = new RegExp(`db\\(['\"]${table}['"]\\)`, 'g');
      
      if (dbQueryPattern.test(line)) {
        // Skip INSERT operations (they include user_id in the data, not WHERE clause)
        if (/\.insert\(/.test(line)) {
          violations.push({
            file: filePath.replace(process.cwd(), '.'),
            line: lineNumber,
            table,
            query: line.trim(),
            risk: 0,
            status: 'SAFE',
            reason: 'INSERT operation (user_id in data payload)'
          });
          return;
        }
        
        // Check if line includes user_id or userId
        const hasUserIdFilter = /user_id|userId/.test(line) || 
                                /where.*user_id|where.*userId/.test(content.substring(
                                  Math.max(0, content.indexOf(line) - 500),
                                  content.indexOf(line) + 500
                                ));
        
        if (!hasUserIdFilter) {
          // Check if this is a safe pattern
          const safeCheck = isSafePattern(filePath, line, lineNumber);
          
          if (!safeCheck.safe) {
            const risk = RISK_WEIGHTS[table] || 10;
            violations.push({
              file: filePath.replace(process.cwd(), '.'),
              line: lineNumber,
              table,
              query: line.trim(),
              risk,
              status: 'VIOLATION'
            });
            totalRiskScore += risk;
          } else {
            violations.push({
              file: filePath.replace(process.cwd(), '.'),
              line: lineNumber,
              table,
              query: line.trim(),
              risk: 0,
              status: 'SAFE',
              reason: safeCheck.reason
            });
          }
        }
      }
    });
  });
}

/**
 * Recursively scan directory for JS files
 */
function scanDirectory(dir, exclude = []) {
  const files = fs.readdirSync(dir);
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    
    // Skip excluded directories
    if (exclude.some(ex => filePath.includes(ex))) {
      return;
    }
    
    if (stat.isDirectory()) {
      scanDirectory(filePath, exclude);
    } else if (file.endsWith('.js')) {
      scanFile(filePath);
    }
  });
}

/**
 * Print audit results
 */
function printResults() {
  console.log('\n' + '='.repeat(80));
  console.log('TENANT ISOLATION AUDIT REPORT');
  console.log('='.repeat(80) + '\n');
  
  // Group violations by status
  const realViolations = violations.filter(v => v.status === 'VIOLATION');
  const safePatterns = violations.filter(v => v.status === 'SAFE');
  
  console.log(`Total queries scanned: ${violations.length}`);
  console.log(`Real violations: ${realViolations.length}`);
  console.log(`Safe patterns (whitelisted): ${safePatterns.length}`);
  console.log(`\nRisk Score: ${totalRiskScore}/100\n`);
  
  if (totalRiskScore === 0) {
    console.log('✅ NO VIOLATIONS FOUND - All queries are properly tenant-scoped!\n');
    return 0;
  }
  
  // Print real violations first
  if (realViolations.length > 0) {
    console.log('🚨 REAL VIOLATIONS (must be fixed):\n');
    
    realViolations.forEach((v, index) => {
      console.log(`${index + 1}. ${v.file}:${v.line}`);
      console.log(`   Table: ${v.table} (Risk: ${v.risk})`);
      console.log(`   Query: ${v.query}`);
      console.log('');
    });
  }
  
  // Print safe patterns summary (not full list to reduce noise)
  if (safePatterns.length > 0) {
    console.log(`\n✅ SAFE PATTERNS (${safePatterns.length} whitelisted):\n`);
    
    // Group by reason
    const grouped = {};
    safePatterns.forEach(v => {
      const key = v.reason || 'Other';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(v);
    });
    
    Object.entries(grouped).forEach(([reason, items]) => {
      console.log(`  ${reason}: ${items.length} queries`);
    });
  }
  
  console.log('\n' + '='.repeat(80));
  
  if (totalRiskScore > 30) {
    console.log('❌ AUDIT FAILED - Risk score too high. Fix violations before deploying.');
    return 1;
  } else if (totalRiskScore > 0) {
    console.log('⚠️  AUDIT WARNING - Some violations found. Review before deploying.');
    return 0;
  } else {
    console.log('✅ AUDIT PASSED - All tenant isolation checks passed.');
    return 0;
  }
}

// Main execution
const backendDir = path.join(__dirname, '..');
const excludeDirs = ['node_modules', 'tests', 'dist', 'build'];

console.log('🔍 Scanning for tenant isolation violations...');
console.log(`Directory: ${backendDir}`);
console.log(`Excluding: ${excludeDirs.join(', ')}\n`);

scanDirectory(backendDir, excludeDirs);

const exitCode = printResults();
process.exit(exitCode);
