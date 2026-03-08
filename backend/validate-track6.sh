#!/bin/bash

echo "=================================================="
echo "Track 6 API Interface Fix - Validation Report"
echo "=================================================="
echo ""
echo "Product: prod_infershield_001 (InferShield)"
echo "Authorization: CEO-QAGATE2-PROD-001-20260304-CONDITIONAL"
echo "Date: $(date -u '+%Y-%m-%d %H:%M UTC')"
echo ""
echo "Running integration test suite..."
echo ""

# Run the tests and capture results
npm test -- tests/integration/track6-core-integration.test.js 2>&1 > /tmp/track6-results.txt

# Extract results
TOTAL=$(grep "Tests:" /tmp/track6-results.txt | tail -1 | grep -oP '\d+ total' | grep -oP '\d+')
PASSED=$(grep "Tests:" /tmp/track6-results.txt | tail -1 | grep -oP '\d+ passed' | grep -oP '\d+')
FAILED=$(grep "Tests:" /tmp/track6-results.txt | tail -1 | grep -oP '\d+ failed' | grep -oP '\d+')

# Calculate pass rate
PASS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED/$TOTAL)*100}")

echo "=================================================="
echo "RESULTS"
echo "=================================================="
echo ""
echo "Total Tests:    $TOTAL"
echo "Passed:         $PASSED"
echo "Failed:         $FAILED"
echo "Pass Rate:      $PASS_RATE%"
echo ""
echo "TARGET:         ≥80% (≥17/21 tests)"
echo ""

if (( $(echo "$PASS_RATE >= 80" | bc -l) )); then
    echo "✅ STATUS: SUCCESS - Target exceeded!"
else
    echo "❌ STATUS: FAILURE - Below target"
fi

echo ""
echo "=================================================="
echo "Detailed Results:"
echo "=================================================="
grep -E "✓|✕" /tmp/track6-results.txt | head -21

echo ""
echo "Full report: backend/tests/integration/TRACK6_FIX_REPORT.md"
echo "=================================================="
