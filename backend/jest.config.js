module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js', '<rootDir>/src/**/__tests__/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/test/'],
  testTimeout: 30000,
  forceExit: true,
  verbose: true,
  transform: {
    '^.+\\.js$': 'babel-jest'
  },
  transformIgnorePatterns: [
    'node_modules/(?!(module-that-needs-transform)/)'
  ]
};