module.exports = {
  testEnvironment: 'node',
  coveragePathIgnorePatterns: ['/node_modules/'],
  testMatch: ['**/test/**/*.test.js', '**/*.spec.js'],
  testPathIgnorePatterns: [
    '/node_modules/',
    '/test/archive/'
  ],
  collectCoverageFrom: [
    'services/**/*.js',
    'middleware/**/*.js',
    'routes/**/*.js',
    'controllers/**/*.js',
    'workers/**/*.js',
    'jobs/**/*.js',
    '!**/*.test.js',
    '!**/*.spec.js'
  ],
  testTimeout: 30000,
  verbose: true
};
