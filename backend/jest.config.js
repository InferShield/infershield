module.exports = {
  testEnvironment: 'node',
  testMatch: ['<rootDir>/tests/**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/test/'],
  testTimeout: 30000,
  forceExit: true,
  verbose: true
};