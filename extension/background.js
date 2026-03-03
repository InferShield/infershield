// InferShield Background Service Worker
// Handles API calls to InferShield backend

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
  console.log('[InferShield] Extension installed');
  chrome.storage.sync.get(['config'], (result) => {
    if (!result.config) {
      chrome.storage.sync.set({ config: DEFAULT_CONFIG });
      console.log('[InferShield] Default config saved');
    }
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('[InferShield] Message received:', request.action);
  
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
});

// Handle text scanning
async function handleScanText(data, sendResponse) {
  try {
    const config = await getConfig();
    
    if (!config.enabled) {
      sendResponse({ 
        success: true, 
        threat_detected: false,
        message: 'InferShield is disabled' 
      });
      return;
    }
    
    if (!config.apiKey) {
      sendResponse({ 
        success: false, 
        error: 'API key not configured. Click the extension icon to set it up.' 
      });
      return;
    }
    
    console.log('[InferShield] Scanning text...', {
      textLength: data.text.length,
      endpoint: config.apiEndpoint
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
      })
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('[InferShield] API error:', response.status, errorText);
      sendResponse({ 
        success: false, 
        error: `API error: ${response.status} - ${errorText}` 
      });
      return;
    }
    
    const result = await response.json();
    console.log('[InferShield] Scan result:', result);
    
    // Update badge
    if (result.threat_detected) {
      setBadge('⚠️', '#ff4444', 'Threat detected');
    } else {
      setBadge('✓', '#44ff44', 'Safe');
    }
    
    sendResponse({ 
      success: true, 
      ...result,
      mode: config.mode
    });
    
  } catch (error) {
    console.error('[InferShield] Scan error:', error);
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
    sendResponse({ success: true, config });
  } catch (error) {
    console.error('[InferShield] Config error:', error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle badge update
function handleUpdateBadge(data) {
  setBadge(data.text, data.color, data.title);
}

// Get configuration from storage
function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['config'], (result) => {
      resolve(result.config || DEFAULT_CONFIG);
    });
  });
}

// Set extension badge
function setBadge(text, color, title) {
  chrome.action.setBadgeText({ text });
  chrome.action.setBadgeBackgroundColor({ color });
  if (title) {
    chrome.action.setTitle({ title: `InferShield: ${title}` });
  }
}

// Clear badge after delay
function clearBadgeAfterDelay(delay = 3000) {
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
    chrome.action.setTitle({ title: 'InferShield' });
  }, delay);
}
