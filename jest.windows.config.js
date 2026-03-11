/**
 * Jest configuration for Windows validation test suite
 * Issue #77 — Windows 10/11 Hardware Validation
 */

'use strict';

module.exports = {
  displayName: 'windows-validation',
  testEnvironment: 'node',
  testMatch: [
    '<rootDir>/tests/windows/**/*.test.js'
  ],
  moduleDirectories: ['node_modules'],
  testTimeout: 30000,
  verbose: true,
  collectCoverage: false,
  // Map backend module paths so tests can require them
  moduleNameMapper: {
    '^../../../backend/(.*)$': '<rootDir>/backend/$1',
    '^../../backend/(.*)$': '<rootDir>/backend/$1'
  },
  setupFilesAfterFramework: [],
  globals: {
    'process.env.NODE_ENV': 'test'
  }
};
