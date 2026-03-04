/**
 * Jest Test Setup
 * Sets environment variables for test environment
 */

process.env.JWT_SECRET = 'test_jwt_secret_component8';
process.env.NODE_ENV = 'test';

// Suppress console output during tests (optional)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// };
