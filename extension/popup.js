// InferShield Popup Script
// Handles extension settings

console.log('[InferShield] Popup loaded');

// Default config
const DEFAULT_CONFIG = {
  apiEndpoint: 'http://localhost:5000',
  apiKey: '',
  mode: 'warn',
  enabled: true,
  enabledSites: {
    'chat.openai.com': true,
    'claude.ai': true,
    'gemini.google.com': true,
    'github.com': true
  }
};

// Load settings on popup open
document.addEventListener('DOMContentLoaded', async () => {
  loadSettings();
  
  // Attach event listeners
  document.getElementById('save').addEventListener('click', saveSettings);
  document.getElementById('dashboardLink').addEventListener('click', openDashboard);
  document.getElementById('privacyLink').addEventListener('click', openPrivacy);
});

// Load current settings
async function loadSettings() {
  try {
    const result = await chrome.storage.sync.get(['config']);
    const config = result.config || DEFAULT_CONFIG;
    
    console.log('[InferShield] Loaded config:', config);
    
    // Populate form
    document.getElementById('apiEndpoint').value = config.apiEndpoint || '';
    document.getElementById('apiKey').value = config.apiKey || '';
    document.getElementById('mode').value = config.mode || 'warn';
    document.getElementById('enabled').checked = config.enabled !== false;
    
    // Site checkboxes
    document.getElementById('site-chatgpt').checked = config.enabledSites?.['chat.openai.com'] !== false;
    document.getElementById('site-claude').checked = config.enabledSites?.['claude.ai'] !== false;
    document.getElementById('site-gemini').checked = config.enabledSites?.['gemini.google.com'] !== false;
    document.getElementById('site-github').checked = config.enabledSites?.['github.com'] !== false;
    
    // Update dashboard link
    if (config.apiEndpoint) {
      const dashboardUrl = config.apiEndpoint.replace(/\/api.*$/, '') + '/dashboard.html';
      document.getElementById('dashboardLink').href = dashboardUrl;
    }
    
  } catch (error) {
    console.error('[InferShield] Error loading settings:', error);
    showStatus('Error loading settings', 'error');
  }
}

// Save settings
async function saveSettings() {
  try {
    const config = {
      apiEndpoint: document.getElementById('apiEndpoint').value.trim().replace(/\/$/, ''),
      apiKey: document.getElementById('apiKey').value.trim(),
      mode: document.getElementById('mode').value,
      enabled: document.getElementById('enabled').checked,
      enabledSites: {
        'chat.openai.com': document.getElementById('site-chatgpt').checked,
        'claude.ai': document.getElementById('site-claude').checked,
        'gemini.google.com': document.getElementById('site-gemini').checked,
        'github.com': document.getElementById('site-github').checked
      }
    };
    
    console.log('[InferShield] Saving config:', config);
    
    // Validate
    if (!config.apiEndpoint) {
      showStatus('Please enter API endpoint', 'error');
      return;
    }
    
    if (!config.apiKey) {
      showStatus('Please enter API key', 'error');
      return;
    }
    
    // Save to storage
    await chrome.storage.sync.set({ config });
    
    console.log('[InferShield] Config saved successfully');
    showStatus('✓ Settings saved successfully!', 'success');
    
    // Clear status after 3 seconds
    setTimeout(() => {
      document.getElementById('status').style.display = 'none';
    }, 3000);
    
  } catch (error) {
    console.error('[InferShield] Error saving settings:', error);
    showStatus('Error saving settings: ' + error.message, 'error');
  }
}

// Show status message
function showStatus(message, type) {
  const statusEl = document.getElementById('status');
  statusEl.textContent = message;
  statusEl.className = `status ${type}`;
  statusEl.style.display = 'block';
}

// Open dashboard
function openDashboard(e) {
  e.preventDefault();
  const apiEndpoint = document.getElementById('apiEndpoint').value.trim();
  if (apiEndpoint) {
    const dashboardUrl = apiEndpoint.replace(/\/api.*$/, '') + '/dashboard.html';
    chrome.tabs.create({ url: dashboardUrl });
  } else {
    alert('Please configure your API endpoint first');
  }
}

// Open privacy policy
function openPrivacy(e) {
  e.preventDefault();
  chrome.tabs.create({ url: 'https://github.com/InferShield/infershield/blob/main/PRIVACY_POLICY.md' });
}
