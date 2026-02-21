# User Acceptance Testing (UAT) - InferShield v0.3.1
## Compliance Reporting System

**Version:** v0.3.1  
**Test Date:** _________________  
**Tester:** _________________  
**Environment:** Staging / Production (circle one)

---

## Prerequisites

### System Requirements
- [ ] InferShield v0.3.1 deployed
- [ ] Database migrations run (`npx knex migrate:latest`)
- [ ] Proxy updated with compliance logging
- [ ] Backend API accessible
- [ ] At least 30 days of audit log data (for realistic testing)

### Test Data Setup
If starting fresh, generate test audit logs:

```bash
# Run the proxy with test traffic for 5 minutes
cd proxy
npm test  # or use test_live.py

# Verify logs exist
curl http://localhost:5000/api/logs | jq 'length'
# Expected: >100 log entries
```

---

## Test Suite

### **Test 1: Database Schema Verification**

**Objective:** Verify all compliance tables and indexes exist

**Steps:**
1. Connect to SQLite database:
   ```bash
   sqlite3 backend/dev.sqlite3
   ```

2. Check tables exist:
   ```sql
   .tables
   ```
   **Expected:** `audit_logs`, `compliance_reports`, `report_templates`, `report_schedules`

3. Check audit_logs schema:
   ```sql
   PRAGMA table_info(audit_logs);
   ```
   **Expected columns:** id, prompt, response, metadata, created_at, timestamp, policy_type, severity, user_id, status, risk_score, agent_id

4. Check indexes:
   ```sql
   .indexes audit_logs
   ```
   **Expected:** Indexes on timestamp, policy_type, severity, composite index

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 2: Data Aggregation**

**Objective:** Verify audit log filtering and statistics work correctly

**Steps:**
1. Test date range filtering:
   ```bash
   curl -X POST http://localhost:5000/api/internal/aggregate \
     -H "Content-Type: application/json" \
     -d '{
       "startDate": "2026-02-01",
       "endDate": "2026-02-21"
     }' | jq .
   ```
   **Expected:** JSON with filtered logs

2. Test policy type filtering:
   ```bash
   curl -X POST http://localhost:5000/api/internal/aggregate \
     -H "Content-Type: application/json" \
     -d '{
       "policyType": "prompt_injection"
     }' | jq .
   ```
   **Expected:** Only prompt_injection events

3. Test statistics generation:
   ```bash
   curl -X POST http://localhost:5000/api/internal/stats \
     -H "Content-Type: application/json" \
     -d '{
       "startDate": "2026-02-01",
       "endDate": "2026-02-21"
     }' | jq .
   ```
   **Expected:** Summary statistics with event counts, severity distribution, top violators

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 3: Report Generation (PDF)**

**Objective:** Generate a PDF compliance report for GDPR

**Steps:**
1. Generate report:
   ```bash
   curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "gdpr",
       "startDate": "2026-02-01",
       "endDate": "2026-02-21",
       "format": "pdf",
       "templateType": "executive-summary"
     }' | jq .
   ```
   **Expected response:**
   ```json
   {
     "reportId": "...",
     "status": "completed",
     "filePath": "/reports/gdpr/2026-02-21/..."
   }
   ```

2. Download and verify PDF:
   ```bash
   curl -X GET http://localhost:5000/api/reports/{reportId}/download \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     --output test-report.pdf
   
   # Open and verify:
   open test-report.pdf  # macOS
   # or xdg-open test-report.pdf  # Linux
   ```

**PDF Verification Checklist:**
- [ ] PDF opens without errors
- [ ] Company name and branding displayed
- [ ] Report date range correct
- [ ] Executive summary includes key metrics
- [ ] Charts/graphs render correctly (if applicable)
- [ ] No sensitive metadata in PDF properties

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 4: Report Generation (CSV)**

**Objective:** Generate CSV report with raw audit data

**Steps:**
1. Generate CSV report:
   ```bash
   curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "soc2",
       "startDate": "2026-02-01",
       "endDate": "2026-02-21",
       "format": "csv",
       "templateType": "detailed-audit"
     }' | jq .
   ```

2. Download CSV:
   ```bash
   curl -X GET http://localhost:5000/api/reports/{reportId}/download \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     --output test-report.csv
   ```

3. Verify CSV structure:
   ```bash
   head test-report.csv
   ```

**CSV Verification Checklist:**
- [ ] CSV has proper headers
- [ ] Data includes timestamp, policy_type, severity, status, risk_score
- [ ] No encoding issues
- [ ] Opens correctly in Excel/Google Sheets

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 5: Report Generation (JSON)**

**Objective:** Generate structured JSON report

**Steps:**
1. Generate JSON report:
   ```bash
   curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "hipaa",
       "startDate": "2026-02-01",
       "endDate": "2026-02-21",
       "format": "json",
       "templateType": "incident-report"
     }' | jq .
   ```

2. Download and verify JSON:
   ```bash
   curl -X GET http://localhost:5000/api/reports/{reportId}/download \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```

**JSON Verification Checklist:**
- [ ] Valid JSON structure
- [ ] Contains metadata (framework, date_range, generated_at)
- [ ] Contains aggregated data
- [ ] Contains summary statistics

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 6: Report Listing & Pagination**

**Objective:** Verify report listing API works

**Steps:**
1. List all reports:
   ```bash
   curl -X GET http://localhost:5000/api/reports \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```
   **Expected:** Array of report metadata

2. Test pagination:
   ```bash
   curl -X GET "http://localhost:5000/api/reports?page=1&limit=10" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```

3. Get specific report metadata:
   ```bash
   curl -X GET http://localhost:5000/api/reports/{reportId} \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 7: Report Deletion**

**Objective:** Verify report deletion works

**Steps:**
1. Create a test report (use Test 3 steps)
2. Note the reportId
3. Delete report:
   ```bash
   curl -X DELETE http://localhost:5000/api/reports/{reportId} \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
   **Expected:** 204 No Content

4. Verify deletion:
   ```bash
   curl -X GET http://localhost:5000/api/reports/{reportId} \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
   **Expected:** 404 Not Found

5. Verify file is deleted from filesystem:
   ```bash
   ls -la backend/reports/  # Report file should be gone
   ```

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 8: Schedule Creation**

**Objective:** Create a weekly compliance report schedule

**Steps:**
1. Create schedule:
   ```bash
   curl -X POST http://localhost:5000/api/schedules \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "gdpr",
       "cron_expression": "0 9 * * 1",
       "filters": {
         "severity": ["high", "critical"]
       },
       "format": "pdf",
       "templateType": "executive-summary",
       "enabled": true
     }' | jq .
   ```
   **Expected:** Schedule created with ID

2. Verify schedule appears in list:
   ```bash
   curl -X GET http://localhost:5000/api/schedules \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 9: Schedule Execution (Manual Trigger)**

**Objective:** Verify scheduled report generation works

**Steps:**
1. Get schedule ID from Test 8
2. Manually trigger schedule:
   ```bash
   curl -X POST http://localhost:5000/api/schedules/{scheduleId}/run \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq .
   ```
   **Expected:** Report generated successfully

3. Verify report was created:
   ```bash
   curl -X GET http://localhost:5000/api/reports \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq '.[] | select(.schedule_id == "{scheduleId}")'
   ```

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 10: Schedule Management (Update & Delete)**

**Objective:** Verify schedule CRUD operations

**Steps:**
1. Update schedule (disable it):
   ```bash
   curl -X PUT http://localhost:5000/api/schedules/{scheduleId} \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "enabled": false
     }' | jq .
   ```

2. Verify schedule is disabled:
   ```bash
   curl -X GET http://localhost:5000/api/schedules/{scheduleId} \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" | jq '.enabled'
   ```
   **Expected:** false

3. Delete schedule:
   ```bash
   curl -X DELETE http://localhost:5000/api/schedules/{scheduleId} \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN"
   ```
   **Expected:** 204 No Content

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 11: RBAC Enforcement**

**Objective:** Verify role-based access control works

**Test as different roles:**

**Admin:** Should have full access

**Policy Manager:** Should be able to:
- [ ] Generate reports for own policies
- [ ] View own reports
- [ ] Create schedules

**Auditor:** Should be able to:
- [ ] View all reports (read-only)
- [ ] Download reports
- [ ] NOT create/delete reports

**Developer:** Should:
- [ ] NOT have access to compliance endpoints
- [ ] Receive 403 Forbidden

**Steps to test:**
1. Create tokens for each role (setup required)
2. Repeat Tests 3-10 with each role's token
3. Verify expected access patterns

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 12: Templates Verification**

**Objective:** Verify all 9 compliance templates exist and render

**Steps:**
1. Check template files exist:
   ```bash
   ls -la backend/templates/gdpr/
   ls -la backend/templates/soc2/
   ls -la backend/templates/hipaa/
   ```
   **Expected:** 3 files in each directory (executive-summary.hbs, detailed-audit.hbs, incident-report.hbs)

2. Test each template by generating reports:
   - [ ] GDPR Executive Summary (PDF)
   - [ ] GDPR Detailed Audit (PDF)
   - [ ] GDPR Incident Report (PDF)
   - [ ] SOC 2 Executive Summary (PDF)
   - [ ] SOC 2 Detailed Audit (PDF)
   - [ ] SOC 2 Incident Report (PDF)
   - [ ] HIPAA Executive Summary (PDF)
   - [ ] HIPAA Detailed Audit (PDF)
   - [ ] HIPAA Incident Report (PDF)

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 13: Performance Test (30-Day Report)**

**Objective:** Verify performance with realistic data volume

**Prerequisites:**
- At least 10,000 audit log entries spanning 30 days

**Steps:**
1. Generate 30-day report:
   ```bash
   time curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "gdpr",
       "startDate": "2026-01-22",
       "endDate": "2026-02-21",
       "format": "pdf",
       "templateType": "detailed-audit"
     }' | jq .
   ```

**Performance Criteria:**
- [ ] Query completes in <5 seconds
- [ ] PDF generates in <10 seconds
- [ ] Memory usage remains stable
- [ ] No database lock issues

**Actual Performance:**
- Query time: _______ seconds
- Generation time: _______ seconds
- Total time: _______ seconds

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 14: Error Handling**

**Objective:** Verify graceful error handling

**Test Cases:**

1. **Invalid date range (end before start):**
   ```bash
   curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "gdpr",
       "startDate": "2026-02-21",
       "endDate": "2026-02-01",
       "format": "pdf"
     }'
   ```
   **Expected:** 400 Bad Request with helpful error message
   - [ ] Pass

2. **Invalid framework:**
   ```bash
   curl -X POST http://localhost:5000/api/reports \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "invalid_framework",
       "startDate": "2026-02-01",
       "endDate": "2026-02-21",
       "format": "pdf"
     }'
   ```
   **Expected:** 400 Bad Request
   - [ ] Pass

3. **Invalid cron expression:**
   ```bash
   curl -X POST http://localhost:5000/api/schedules \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
     -d '{
       "framework": "gdpr",
       "cron_expression": "invalid cron",
       "format": "pdf"
     }'
   ```
   **Expected:** 400 Bad Request with cron validation error
   - [ ] Pass

4. **Missing authentication:**
   ```bash
   curl -X GET http://localhost:5000/api/reports
   ```
   **Expected:** 401 Unauthorized
   - [ ] Pass

5. **Insufficient permissions:**
   ```bash
   curl -X DELETE http://localhost:5000/api/reports/{reportId} \
     -H "Authorization: Bearer AUDITOR_TOKEN"
   ```
   **Expected:** 403 Forbidden
   - [ ] Pass

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

### **Test 15: End-to-End Workflow**

**Objective:** Complete realistic compliance workflow

**Scenario:** Quarterly GDPR compliance report for audit

**Steps:**
1. **Setup:** Ensure 90 days of audit logs exist
2. **Generate:** Create quarterly GDPR detailed audit report (PDF + CSV)
3. **Review:** Download and open both files
4. **Schedule:** Set up monthly recurring report
5. **Archive:** Store report metadata in compliance_reports table
6. **Verify:** Confirm report meets GDPR Article 30 requirements

**Acceptance Criteria:**
- [ ] Report generation completes successfully
- [ ] PDF is audit-ready (professional formatting, complete data)
- [ ] CSV contains raw data for further analysis
- [ ] Schedule created for automated monthly reports
- [ ] Report metadata stored in database
- [ ] Report can be retrieved 30 days later

**Result:** ✅ Pass / ❌ Fail  
**Notes:**

---

## Summary

**Total Tests:** 15  
**Passed:** _____  
**Failed:** _____  
**Blocked:** _____  

**Critical Issues:**

**Minor Issues:**

**Recommendations:**

**Sign-off:**

Tester Signature: _________________ Date: _________

Product Owner Signature: _________________ Date: _________

---

## Appendix: Test Data Generation

If you need to generate test audit logs for UAT:

```javascript
// test-data-generator.js
const axios = require('axios');

async function generateTestLogs(count = 1000) {
  const frameworks = ['gdpr', 'soc2', 'hipaa'];
  const policyTypes = ['prompt_injection', 'sql_injection', 'data_exfiltration', 'pii_detection'];
  const severities = ['low', 'medium', 'high', 'critical'];
  const statuses = ['allowed', 'blocked'];

  for (let i = 0; i < count; i++) {
    const framework = frameworks[Math.floor(Math.random() * frameworks.length)];
    const policyType = policyTypes[Math.floor(Math.random() * policyTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const status = Math.random() > 0.3 ? 'allowed' : 'blocked';
    const riskScore = severity === 'critical' ? 90 + Math.floor(Math.random() * 10) :
                     severity === 'high' ? 70 + Math.floor(Math.random() * 20) :
                     severity === 'medium' ? 40 + Math.floor(Math.random() * 30) :
                     Math.floor(Math.random() * 40);

    await axios.post('http://localhost:5000/api/logs', {
      prompt: `Test prompt ${i} for ${framework}`,
      response: `Test response ${i}`,
      timestamp: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000).toISOString(),
      policy_type: policyType,
      severity: severity,
      status: status,
      risk_score: riskScore,
      agent_id: `test-agent-${i % 10}`,
      user_id: `user-${i % 50}`,
      metadata: { test: true, framework }
    });

    if (i % 100 === 0) console.log(`Generated ${i}/${count} logs...`);
  }
  console.log('Test data generation complete!');
}

generateTestLogs(1000);
```

Run with: `node test-data-generator.js`
