# InferShield E2E Test Report

**Date:** 2026-02-23T13:43:21.470Z

## Summary

| Metric | Value | Status |
|--------|-------|--------|
| Attack Detection Rate | 55.6% | ❌ |
| False Positive Rate | 0.0% | ✅ |
| F1 Score | 0.714 | ✅ |
| Avg Latency | 0.15ms | ✅ |
| Memory Growth | 0.25MB | ✅ |

## Attack Detection

- **Total attacks:** 9
- **Detected:** 5
- **Missed:** 4

### Failed Attack Scenarios

- **attack_encoding_evasion_001** (encoding_evasion): Expected allowed=false, got true
- **attack_encoding_evasion_004** (encoding_evasion): Expected allowed=false, got true
- **attack_interleaving_001** (interleaving): Expected allowed=false, got true
- **attack_interleaving_002** (interleaving): Expected allowed=false, got true

## Benign Workload

- **Total benign:** 6
- **Correct:** 6
- **False positives:** 0

## Policy Breakdown

| Policy | Hits |
|--------|------|
| xss-detection | 1 |
| sql-injection | 1 |
| prompt-injection | 2 |
| data-exfiltration | 1 |

## Performance

- **Avg latency:** 0.15ms
- **Total latency:** 2.18ms
- **Memory growth:** 0.25MB
