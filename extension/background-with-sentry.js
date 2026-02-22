// InferShield Background Service Worker
// Handles API calls to InferShield backend
// Now with Sentry error monitoring

import { initSentry, captureError, captureMessage, addBreadcrumb } from './sentry-config.js';

// Initialize Sentry on service worker load
initSentry();

console.log('[InferShield] Background service worker loaded');

// Default configuration
const DEFAULT_CONFIG = {
  apiEndpoint: 'https://app.infershield.io', // Cloud API (self-hosters can change to localhost:5000)
  apiKey: '',
  mode: 'warn', // 'block' or 'warn'
  enabled: true,
  enabledSites: {
    'chat.openai.com': true,
    'claude.ai': true,
    'gemini.google.com': true,
    'github.com': true
  }
};

// Initialize storage on install
chrome.runtime.onInstalled.addListener(() => {
  try {
    console.log('[InferShield] Extension installed');
    addBreadcrumb('Extension installed', { component: 'background', action: 'install' });
    
    chrome.storage.sync.get(['config'], (result) => {
      if (!result.config) {
        chrome.storage.sync.set({ config: DEFAULT_CONFIG });
        console.log('[InferShield] Default config saved');
        captureMessage('Extension installed with default config', 'info', { component: 'background' });
      }
    });
  } catch (error) {
    console.error('[InferShield] Install error:', error);
    captureError(error, { component: 'background', action: 'install' });
  }
});

// Global error handlers (catch errors outside try-catch)
self.addEventListener('error', (event) => {
  console.error('[InferShield] Uncaught error:', event.error);
  captureError(event.error, {
    component: 'background',
    action: 'uncaught_error',
    message: event.message,
    filename: event.filename,
    lineno: event.lineno
  });
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[InferShield] Unhandled promise rejection:', event.reason);
  captureError(event.reason, {
    component: 'background',
    action: 'unhandled_rejection'
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    console.log('[InferShield] Message received:', request.action);
    addBreadcrumb('Message received', {
      component: 'background',
      action: request.action,
      site: request.data?.site
    });
    
    if (request.action === 'scanText') {
      handleScanText(request.data, sendResponse);
      return true; // Keep channel open for async response
    }
    
    if (request.action === 'getConfig') {
      handleGetConfig(sendResponse);
      return true;
    }
    
    if (request.action === 'updateBadge') {
      handleUpdateBadge(request.data);
      sendResponse({ success: true });
    }
  } catch (error) {
    console.error('[InferShield] Message handler error:', error);
    captureError(error, {
      component: 'background',
      action: 'message_handler',
      messageAction: request.action
    });
    sendResponse({ success: false, error: error.message });
  }
});

// Handle text scanning
async function handleScanText(data, sendResponse) {
  const startTime = Date.now();
  
  try {
    const config = await getConfig();
    
    if (!config.enabled) {
      addBreadcrumb('Scan skipped: extension disabled', { component: 'background', site: data.site });
      sendResponse({ 
        success: true, 
        threat_detected: false,
        message: 'InferShield is disabled' 
      });
      return;
    }
    
    if (!config.apiKey) {
      const error = new Error('API key not configured');
      captureError(error, {
        component: 'background',
        action: 'scan',
        site: data.site,
        level: 'warning'
      });
      
      sendResponse({ 
        success: false, 
        error: 'API key not configured. Click the extension icon to set it up.' 
      });
      return;
    }
    
    console.log('[InferShield] Scanning text...', {
      textLength: data.text.length,
      endpoint: config.apiEndpoint,
      site: data.site
    });
    
    addBreadcrumb('Starting scan', {
      component: 'background',
      action: 'scan_start',
      site: data.site
    });
    
    // Call InferShield API
    const response = await fetch(`${config.apiEndpoint}/api/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': config.apiKey
      },
      body: JSON.stringify({
        prompt: data.text,
        agent_id: 'browser-extension',
        metadata: {
          site: data.site,
          url: data.url
        }
      }),
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[InferShield] API error:', response.status, errorText);
      
      const apiError = new Error(`API error: ${response.status}`);
      captureError(apiError, {
        component: 'background',
        action: 'api_call',
        site: data.site,
        status: response.status,
        level: response.status >= 500 ? 'error' : 'warning'
      });
      
      sendResponse({ 
        success: false, 
        error: `API error: ${response.status} - ${errorText}` 
      });
      return;
    }
    
    const result = await response.json();
    const scanDuration = Date.now() - startTime;
    
    console.log('[InferShield] Scan result:', result, `(${scanDuration}ms)`);
    
    addBreadcrumb('Scan completed', {
      component: 'background',
      action: 'scan_complete',
      site: data.site,
      threat_detected: result.threat_detected,
      status: 'success'
    });
    
    // Log slow scans
    if (scanDuration > 1000) {
      captureMessage('Slow scan detected', 'warning', {
        component: 'background',
        action: 'scan',
        site: data.site,
        duration_ms: scanDuration
      });
    }
    
    // Update badge
    if (result.threat_detected) {
      setBadge('⚠️', '#ff4444', 'Threat detected');
    } else {
      setBadge('✓', '#44ff44', 'Safe');
    }
    
    sendResponse({ 
      success: true, 
      ...result,
      mode: config.mode,
      scan_duration_ms: scanDuration
    });
    
  } catch (error) {
    const scanDuration = Date.now() - startTime;
    console.error('[InferShield] Scan error:', error);
    
    // Determine error type for better categorization
    let errorType = 'unknown';
    if (error.name === 'AbortError' || error.name === 'TimeoutError') {
      errorType = 'timeout';
    } else if (error.message.includes('fetch')) {
      errorType = 'network';
    } else if (error.message.includes('JSON')) {
      errorType = 'parse';
    }
    
    captureError(error, {
      component: 'background',
      action: 'scan',
      site: data.site,
      error_type: errorType,
      duration_ms: scanDuration
    });
    
    sendResponse({ 
      success: false, 
      error: error.message || 'Network error. Is InferShield backend running?' 
    });
  }
}

// Handle config request
async function handleGetConfig(sendResponse) {
  try {
    const config = await getConfig();
    addBreadcrumb('Config retrieved', { component: 'background', action: 'get_config' });
    sendResponse({ success: true, config });
  } catch (error) {
    console.error('[InferShield] Config error:', error);
    captureError(error, { component: 'background', action: 'get_config' });
    sendResponse({ success: false, error: error.message });
  }
}

// Handle badge update
function handleUpdateBadge(data) {
  try {
    setBadge(data.text, data.color, data.title);
  } catch (error) {
    console.error('[InferShield] Badge update error:', error);
    captureError(error, { component: 'background', action: 'update_badge' });
  }
}

// Get configuration from storage
function getConfig() {
  return new Promise((resolve, reject) => {
    try {
      chrome.storage.sync.get(['config'], (result) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }
        resolve(result.config || DEFAULT_CONFIG);
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Set extension badge
function setBadge(text, color, title) {
  try {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color });
    if (title) {
      chrome.action.setTitle({ title: `InferShield: ${title}` });
    }
  } catch (error) {
    // Badge API might not be available in all contexts
    console.warn('[InferShield] Badge update failed:', error);
  }
}

// Clear badge after delay
function clearBadgeAfterDelay(delay = 3000) {
  setTimeout(() => {
    try {
      chrome.action.setBadgeText({ text: '' });
      chrome.action.setTitle({ title: 'InferShield' });
    } catch (error) {
      console.warn('[InferShield] Badge clear failed:', error);
    }
  }, delay);
}
