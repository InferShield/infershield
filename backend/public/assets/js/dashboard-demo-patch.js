/**
 * Demo Mode Integration for Dashboard
 * Add this code at the top of dashboard.js (after API_BASE definition)
 * to enable demo mode data loading
 */

// Demo Mode Helper Functions
async function loadDemoUserData() {
  const demoData = await window.InferShieldDemoMode.getData();
  
  if (demoData && demoData.user) {
    currentUser = demoData.user;
    document.getElementById('userName').textContent = currentUser.name;
    document.getElementById('userPlan').textContent = currentUser.plan;
    
    // Account form
    document.getElementById('accountEmail').value = currentUser.email;
    document.getElementById('accountName').value = currentUser.name || '';
    document.getElementById('accountCompany').value = currentUser.company || '';
  }
}

async function loadDemoUsageData() {
  const demoData = await window.InferShieldDemoMode.getData();
  
  if (demoData && demoData.stats) {
    const stats = demoData.stats;
    
    // Update stats
    document.getElementById('totalRequests').textContent = stats.totalRequests;
    document.getElementById('piiDetections').textContent = stats.piiDetections;
    
    // Update quota
    document.getElementById('usedRequests').textContent = stats.quotaUsed;
    document.getElementById('limitRequests').textContent = stats.quotaLimit;
    document.getElementById('quotaPercentage').textContent = Math.round(stats.quotaPercentage) + '%';
    document.getElementById('quotaBar').style.width = Math.min(stats.quotaPercentage, 100) + '%';
    
    const percentage = stats.quotaPercentage;
    if (percentage >= 100) {
      document.getElementById('quotaBar').classList.add('warning');
      document.getElementById('quotaMessage').textContent = '⚠ Quota exceeded';
      document.getElementById('quotaMessage').style.color = '#ff4444';
    } else if (percentage > 80) {
      document.getElementById('quotaBar').classList.add('warning');
      document.getElementById('quotaMessage').textContent = '⚠ Approaching limit';
      document.getElementById('quotaMessage').style.color = '#ffaa00';
    } else {
      document.getElementById('quotaMessage').textContent = '✓ Within quota';
    }
  }
}

async function loadDemoAPIKeys() {
  const demoData = await window.InferShieldDemoMode.getData();
  
  if (demoData && demoData.apiKeys) {
    apiKeys = demoData.apiKeys.map(key => ({
      id: key.id,
      name: key.name,
      description: key.description,
      key_prefix: key.key_preview,
      created_at: key.created_at,
      last_used_at: key.last_used,
      total_requests: key.usage_count,
      status: 'active'
    }));
    renderAPIKeys();
  }
}

// Patch: Insert demo mode checks into existing load functions
// Replace loadUserData(), loadUsageData(), loadAPIKeys() with these versions:

// Modified loadUserData with demo mode support
async function loadUserData_withDemo() {
  // Check demo mode first
  if (window.InferShieldDemoMode && window.InferShieldDemoMode.isActive()) {
    await loadDemoUserData();
    return;
  }
  
  // Original implementation
  try {
    const response = await apiRequest('/auth/me');
    const data = await response.json();
    
    if (data.success) {
      currentUser = data.user;
      document.getElementById('userName').textContent = currentUser.name || currentUser.email;
      document.getElementById('userPlan').textContent = (currentUser.plan || 'free').toUpperCase();
      
      // Account form
      document.getElementById('accountEmail').value = currentUser.email;
      document.getElementById('accountName').value = currentUser.name || '';
      document.getElementById('accountCompany').value = currentUser.company || '';
    }
  } catch (error) {
    console.error('Failed to load user:', error);
  }
}

// Modified loadUsageData with demo mode support
async function loadUsageData_withDemo() {
  // Check demo mode first
  if (window.InferShieldDemoMode && window.InferShieldDemoMode.isActive()) {
    await loadDemoUsageData();
    return;
  }
  
  // Original implementation continues...
  try {
    const response = await apiRequest('/usage/current');
    const data = await response.json();
    
    if (data.success) {
      currentUsage = data;
      let totalRequests = data.usage.total_requests;
      let totalPiiDetections = data.usage.total_pii_detections;
      
      if (totalRequests === 0 && apiKeys.length > 0) {
        totalRequests = apiKeys.reduce((sum, key) => sum + (key.total_requests || 0), 0);
      }
      
      document.getElementById('totalRequests').textContent = totalRequests;
      document.getElementById('piiDetections').textContent = totalPiiDetections;
      
      document.getElementById('usedRequests').textContent = totalRequests;
      document.getElementById('limitRequests').textContent = 
        data.quota.limit === Infinity ? '∞' : data.quota.limit;
      
      const percentage = data.quota.limit === Infinity ? 0 : Math.round((totalRequests / data.quota.limit) * 100);
      document.getElementById('quotaPercentage').textContent = percentage + '%';
      document.getElementById('quotaBar').style.width = Math.min(percentage, 100) + '%';
      
      if (totalRequests >= data.quota.limit && data.quota.limit !== Infinity) {
        document.getElementById('quotaBar').classList.add('warning');
        document.getElementById('quotaMessage').textContent = '⚠ Quota exceeded';
        document.getElementById('quotaMessage').style.color = '#ff4444';
      } else if (percentage > 80) {
        document.getElementById('quotaBar').classList.add('warning');
        document.getElementById('quotaMessage').textContent = '⚠ Approaching limit';
        document.getElementById('quotaMessage').style.color = '#ffaa00';
      }
    }
  } catch (error) {
    console.error('Failed to load usage:', error);
  }
}

// Modified loadAPIKeys with demo mode support
async function loadAPIKeys_withDemo() {
  // Check demo mode first
  if (window.InferShieldDemoMode && window.InferShieldDemoMode.isActive()) {
    await loadDemoAPIKeys();
    return;
  }
  
  // Original implementation
  try {
    const response = await apiRequest('/keys');
    const data = await response.json();
    
    if (data.success) {
      apiKeys = data.keys;
      renderAPIKeys();
    }
  } catch (error) {
    console.error('Failed to load API keys:', error);
  }
}
