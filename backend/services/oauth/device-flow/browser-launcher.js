/**
 * Browser Launcher
 * 
 * Handles browser launch for OAuth device authorization.
 * Platform-agnostic browser opening utility.
 * 
 * Supports:
 * - macOS (open)
 * - Linux (xdg-open)
 * - Windows (start)
 * - Fallback to console URL display
 * 
 * @module oauth/device-flow/browser-launcher
 * @related Issue #1 - OAuth Device Flow
 */

const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');

const execAsync = promisify(exec);

/**
 * Browser Launcher
 * 
 * Launches system browser for OAuth authorization flow.
 */
class BrowserLauncher {
  /**
   * Launch browser with authorization URL
   * 
   * @param {string} verificationUri - OAuth verification URL
   * @param {string} userCode - User code to display
   * @returns {Promise<Object>} Launch result
   * @returns {boolean} .success - Whether browser launched
   * @returns {string} [.error] - Error message if launch failed
   * @returns {string} [.fallbackMessage] - Console message if browser failed
   */
  async launchBrowser(verificationUri, userCode) {
    console.log('\n===========================================');
    console.log('  OAuth Device Authorization Required');
    console.log('===========================================');
    console.log(`\nYour code: ${userCode}`);
    console.log(`Verification URL: ${verificationUri}\n`);

    try {
      const command = this._getBrowserCommand();
      const fullCommand = this._buildCommand(command, verificationUri);
      
      console.log('Opening your browser...\n');
      
      // Execute browser launch command
      await execAsync(fullCommand);
      
      console.log('✓ Browser launched successfully');
      console.log(`\nPlease complete authorization in your browser.`);
      console.log(`Enter code: ${userCode}\n`);
      
      return {
        success: true,
        userCode,
        verificationUri
      };
    } catch (error) {
      // Browser launch failed - provide fallback instructions
      const fallbackMessage = this._formatFallbackMessage(verificationUri, userCode);
      
      console.error('✗ Failed to launch browser automatically');
      console.log(fallbackMessage);
      
      return {
        success: false,
        error: error.message,
        fallbackMessage,
        userCode,
        verificationUri
      };
    }
  }

  /**
   * Get platform-specific browser command
   * 
   * @returns {string} Browser launch command
   * @throws {Error} If platform is unsupported
   */
  _getBrowserCommand() {
    const platform = os.platform();
    
    switch (platform) {
      case 'darwin':  // macOS
        return 'open';
      
      case 'linux':
        return 'xdg-open';
      
      case 'win32':   // Windows
        return 'start';
      
      default:
        throw new Error(`Unsupported platform: ${platform}`);
    }
  }

  /**
   * Build full command with URL
   * 
   * @param {string} command - Base browser command
   * @param {string} url - URL to open
   * @returns {string} Full command string
   */
  _buildCommand(command, url) {
    const platform = os.platform();
    
    // Windows 'start' requires special handling
    if (platform === 'win32') {
      // Use empty title ("") and quote the URL
      return `${command} "" "${url}"`;
    }
    
    // macOS and Linux can take URL directly
    return `${command} "${url}"`;
  }

  /**
   * Display fallback authorization instructions
   * 
   * @param {string} verificationUri - OAuth verification URL
   * @param {string} userCode - User code to display
   * @returns {string} Formatted console message
   */
  _formatFallbackMessage(verificationUri, userCode) {
    return `
╔═════════════════════════════════════════════════════════╗
║  Manual Authorization Required                          ║
╚═════════════════════════════════════════════════════════╝

Please complete authorization manually:

1. Open your browser
2. Navigate to: ${verificationUri}
3. Enter the code: ${userCode}
4. Complete the authorization

Waiting for authorization...
`;
  }
}

module.exports = new BrowserLauncher();
