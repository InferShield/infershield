/**
 * OAuth Device Flow Module Index
 * 
 * Central export point for device authorization flow components.
 * 
 * @module oauth/device-flow
 * @related Issue #1 - OAuth Device Flow
 */

const deviceCodeManager = require('./device-code-manager');
const pollingManager = require('./polling-manager');
const browserLauncher = require('./browser-launcher');

module.exports = {
  deviceCodeManager,
  pollingManager,
  browserLauncher,
  
  // Export state enums for convenience
  DeviceCodeState: deviceCodeManager.DeviceCodeState,
  PollingError: pollingManager.PollingError
};
