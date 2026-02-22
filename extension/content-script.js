// InferShield Content Script
// Injects into ChatGPT, Claude, Gemini, GitHub Copilot pages

// IMMEDIATE DEBUG - This should show up first
console.log('🛡️ [InferShield] EXTENSION LOADED - Script executing now!');
console.log('🛡️ [InferShield] URL:', window.location.href);
console.log('🛡️ [InferShield] Hostname:', window.location.hostname);

console.log('[InferShield] Content script loaded on:', window.location.hostname);

let config = null;
let isScanning = false;

// Initialize
(async function init() {
  try {
    console.log('🛡️ [InferShield] Init function starting...');
    
    // Get configuration
    const response = await chrome.runtime.sendMessage({ action: 'getConfig' });
    console.log('🛡️ [InferShield] Got response from background:', response);
    
    if (response.success) {
      config = response.config;
      console.log('[InferShield] Config loaded:', config);
    } else {
      console.error('🛡️ [InferShield] Failed to load config:', response);
      return;
    }
    
    // Check if enabled for this site
    const hostname = window.location.hostname;
    console.log('🛡️ [InferShield] Checking if enabled for:', hostname);
    console.log('🛡️ [InferShield] Config enabled:', config.enabled);
    console.log('🛡️ [InferShield] Enabled sites:', config.enabledSites);
    
    if (!config || !config.enabled || !config.enabledSites[hostname]) {
      console.log('[InferShield] Disabled for this site');
      return;
    }
    
    // Inject based on platform
    if (hostname.includes('chat.openai.com') || hostname.includes('chatgpt.com')) {
      console.log('[InferShield] Injecting for ChatGPT');
      injectChatGPT();
    } else if (hostname.includes('claude.ai')) {
      console.log('[InferShield] Injecting for Claude');
      injectClaude();
    } else if (hostname.includes('gemini.google.com')) {
      console.log('[InferShield] Injecting for Gemini');
      injectGemini();
    } else if (hostname.includes('github.com') && window.location.pathname.includes('/copilot')) {
      console.log('[InferShield] Injecting for GitHub Copilot');
      injectGitHubCopilot();
    }
  } catch (error) {
    console.error('🛡️ [InferShield] CRITICAL ERROR in init:', error);
    console.error('🛡️ [InferShield] Error stack:', error.stack);
  }
})();

// ChatGPT injection
function injectChatGPT() {
  // Find the textarea
  const findTextarea = () => document.querySelector('textarea[placeholder*="Message"]') || 
                               document.querySelector('#prompt-textarea');
  
  // Intercept Enter key
  const handleKeydown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScanning) {
      const textarea = findTextarea();
      if (textarea && textarea.value.trim()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const text = textarea.value;
        const shouldSend = await scanAndConfirm(text, 'ChatGPT');
        
        if (shouldSend) {
          // Allow the send
          isScanning = false;
          // Trigger the original behavior
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }
    }
  };
  
  // Attach listener
  document.addEventListener('keydown', handleKeydown, { capture: true });
  
  // Also intercept the send button click
  const observeSendButton = () => {
    const sendButton = document.querySelector('button[data-testid="send-button"]') ||
                      document.querySelector('button[aria-label="Send"]');
    
    if (sendButton && !sendButton.dataset.infershieldHooked) {
      sendButton.dataset.infershieldHooked = 'true';
      sendButton.addEventListener('click', async (e) => {
        if (isScanning) return;
        
        const textarea = findTextarea();
        if (textarea && textarea.value.trim()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const text = textarea.value;
          const shouldSend = await scanAndConfirm(text, 'ChatGPT');
          
          if (shouldSend) {
            isScanning = false;
            sendButton.click();
          }
        }
      }, { capture: true });
    }
  };
  
  // Observe for button changes
  setInterval(observeSendButton, 1000);
}

// Claude injection
function injectClaude() {
  // Find the contenteditable div
  const findInput = () => document.querySelector('[contenteditable="true"][placeholder*="Talk"]') ||
                          document.querySelector('.ProseMirror');
  
  // Intercept Enter key
  const handleKeydown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScanning) {
      const input = findInput();
      if (input && input.textContent.trim()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const text = input.textContent;
        const shouldSend = await scanAndConfirm(text, 'Claude');
        
        if (shouldSend) {
          isScanning = false;
          input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }
    }
  };
  
  document.addEventListener('keydown', handleKeydown, { capture: true });
  
  // Intercept send button
  const observeSendButton = () => {
    const sendButton = document.querySelector('button[aria-label*="Send"]');
    
    if (sendButton && !sendButton.dataset.infershieldHooked) {
      sendButton.dataset.infershieldHooked = 'true';
      sendButton.addEventListener('click', async (e) => {
        if (isScanning) return;
        
        const input = findInput();
        if (input && input.textContent.trim()) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
          
          const text = input.textContent;
          const shouldSend = await scanAndConfirm(text, 'Claude');
          
          if (shouldSend) {
            isScanning = false;
            sendButton.click();
          }
        }
      }, { capture: true });
    }
  };
  
  setInterval(observeSendButton, 1000);
}

// Gemini injection
function injectGemini() {
  // Similar to ChatGPT but with Gemini-specific selectors
  const findTextarea = () => document.querySelector('.ql-editor') ||
                            document.querySelector('[contenteditable="true"]');
  
  const handleKeydown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScanning) {
      const textarea = findTextarea();
      if (textarea && textarea.textContent.trim()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const text = textarea.textContent;
        const shouldSend = await scanAndConfirm(text, 'Gemini');
        
        if (shouldSend) {
          isScanning = false;
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }
    }
  };
  
  document.addEventListener('keydown', handleKeydown, { capture: true });
}

// GitHub Copilot injection
function injectGitHubCopilot() {
  // GitHub Copilot chat interface
  const findTextarea = () => document.querySelector('textarea[placeholder*="Ask"]');
  
  const handleKeydown = async (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !isScanning) {
      const textarea = findTextarea();
      if (textarea && textarea.value.trim()) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        
        const text = textarea.value;
        const shouldSend = await scanAndConfirm(text, 'GitHub Copilot');
        
        if (shouldSend) {
          isScanning = false;
          textarea.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
        }
      }
    }
  };
  
  document.addEventListener('keydown', handleKeydown, { capture: true });
}

// Scan text and show confirmation modal
async function scanAndConfirm(text, platform) {
  isScanning = true;
  
  try {
    console.log('[InferShield] Scanning text from', platform);
    
    // Show scanning indicator
    showModal({
      type: 'scanning',
      platform
    });
    
    // Send to background for API call
    const response = await chrome.runtime.sendMessage({
      action: 'scanText',
      data: {
        text,
        site: window.location.hostname,
        url: window.location.href
      }
    });
    
    console.log('[InferShield] Scan response:', response);
    
    if (!response.success) {
      showModal({
        type: 'error',
        message: response.error || 'Failed to scan message'
      });
      isScanning = false;
      return false;
    }
    
    if (!response.threat_detected) {
      // No threats, allow send
      hideModal();
      isScanning = false;
      return true;
    }
    
    // Threats detected - show modal and wait for user decision
    return new Promise((resolve) => {
      showModal({
        type: 'threat',
        platform,
        result: response,
        onCancel: () => {
          hideModal();
          isScanning = false;
          resolve(false);
        },
        onRedact: () => {
          // Replace with redacted version
          const input = findCurrentInput();
          if (input) {
            if (input.tagName === 'TEXTAREA') {
              input.value = response.redacted_prompt;
            } else {
              input.textContent = response.redacted_prompt;
            }
          }
          hideModal();
          isScanning = false;
          resolve(true);
        },
        onSendAnyway: () => {
          hideModal();
          isScanning = false;
          resolve(true);
        }
      });
    });
    
  } catch (error) {
    console.error('[InferShield] Scan error:', error);
    showModal({
      type: 'error',
      message: 'Failed to scan message: ' + error.message
    });
    isScanning = false;
    return false;
  }
}

// Find current input element
function findCurrentInput() {
  return document.querySelector('textarea[placeholder*="Message"]') ||
         document.querySelector('#prompt-textarea') ||
         document.querySelector('[contenteditable="true"]') ||
         document.querySelector('.ql-editor');
}

// Show modal overlay
function showModal(options) {
  hideModal(); // Remove any existing modal
  
  const modal = document.createElement('div');
  modal.id = 'infershield-modal';
  modal.className = 'infershield-modal';
  
  let content = '';
  
  if (options.type === 'scanning') {
    content = `
      <div class="infershield-modal-content">
        <div class="infershield-spinner"></div>
        <h2>🛡️ InferShield Scanning...</h2>
        <p>Checking for sensitive information...</p>
      </div>
    `;
  } else if (options.type === 'error') {
    content = `
      <div class="infershield-modal-content">
        <h2>❌ InferShield Error</h2>
        <p>${options.message}</p>
        <button class="infershield-btn infershield-btn-primary" onclick="this.closest('.infershield-modal').remove()">
          Close
        </button>
      </div>
    `;
  } else if (options.type === 'threat') {
    const threats = options.result.threats || [];
    const riskScore = options.result.risk_score || 0;
    const riskColor = riskScore >= 70 ? '#ff4444' : riskScore >= 40 ? '#ffaa44' : '#44ff44';
    
    const threatList = threats.map(t => `
      <div class="infershield-threat-item">
        <span class="infershield-threat-severity infershield-severity-${t.severity}">
          ${t.severity.toUpperCase()}
        </span>
        <span class="infershield-threat-pattern">${t.pattern}</span>
        ${t.matched_text ? `<code class="infershield-threat-match">${escapeHtml(t.matched_text)}</code>` : ''}
      </div>
    `).join('');
    
    content = `
      <div class="infershield-modal-content">
        <h2>⚠️ Sensitive Information Detected</h2>
        <div class="infershield-risk-score" style="border-left-color: ${riskColor}">
          Risk Score: <strong>${riskScore}/100</strong>
        </div>
        <div class="infershield-threats">
          <h3>Threats Found:</h3>
          ${threatList}
        </div>
        <p class="infershield-warning">
          Sending this message may expose sensitive information to ${options.platform}.
        </p>
        <div class="infershield-actions">
          <button class="infershield-btn infershield-btn-danger" id="infershield-cancel">
            ❌ Cancel
          </button>
          <button class="infershield-btn infershield-btn-warning" id="infershield-redact">
            🔒 Redact & Send
          </button>
          <button class="infershield-btn infershield-btn-secondary" id="infershield-send">
            ⚠️ Send Anyway
          </button>
        </div>
        <p class="infershield-footer">
          <small>Protected by <strong>InferShield</strong> | <a href="#" id="infershield-disable-site">Disable for this site</a></small>
        </p>
      </div>
    `;
  }
  
  modal.innerHTML = content;
  document.body.appendChild(modal);
  
  // Attach event listeners
  if (options.type === 'threat') {
    document.getElementById('infershield-cancel')?.addEventListener('click', options.onCancel);
    document.getElementById('infershield-redact')?.addEventListener('click', options.onRedact);
    document.getElementById('infershield-send')?.addEventListener('click', options.onSendAnyway);
    document.getElementById('infershield-disable-site')?.addEventListener('click', (e) => {
      e.preventDefault();
      // TODO: Implement disable for site
      alert('Feature coming soon! Use the extension popup to disable for this site.');
    });
  }
}

// Hide modal
function hideModal() {
  const modal = document.getElementById('infershield-modal');
  if (modal) {
    modal.remove();
  }
}

// Escape HTML
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
