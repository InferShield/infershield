## [0.9.0] - 2026-02-29

### Added
- Detection pipeline and app entry point for end-to-end validation
- Encoding normalization mitigation (Base64, URL encoding, double encoding)
- Behavioral divergence detection for interleaving attacks
- Context analyzer improvements (JWT and API key exclusion)
- Session history tracking for behavioral analysis
- Comprehensive integration test suite (13 tests)
- Performance benchmark suite

### Changed
- Session manager simplified with deterministic cleanup
- Risk scoring now aggregates severity and behavioral metrics
- API key detection made more specific (removed generic pattern)

### Fixed
- False positives from generic alphanumeric pattern matching
- Deterministic cleanup test (2ms, no timers)
- Session history tracking for behavioral divergence
- Risk score aggregation for accurate threat assessment

### Security
- Encoding evasion attacks now mitigated at normalization layer
- Behavioral divergence detection prevents interleaving attacks
- Context-aware detection reduces false positives without weakening coverage

### Validation
- 33 unit tests passing
- 13 integration tests passing
- Performance targets exceeded by 1000-4000x
- No regressions detected

### Known Limitations
- Single-instance deployment (no distributed state)
- In-memory session state (no Redis)
- No multi-session correlation
- Rule-based detection (no ML models)