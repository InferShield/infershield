// API base URL
// In development (local IPs), use same host as frontend, port 5000
// In production, use /api (proxied to backend)
const API_BASE = (window.location.hostname === 'localhost' || 
                  window.location.hostname.startsWith('192.168.') || 
                  window.location.hostname.startsWith('127.') ||
                  window.location.hostname.startsWith('10.') ||
                  window.location.hostname.startsWith('172.'))
    ? `http://${window.location.hostname}:5000/api`
    : '/api';

// Get token
function getToken() {
    return localStorage.getItem('infershield_token');
}

// Clear token
function clearToken() {
    localStorage.removeItem('infershield_token');
}

// Make authenticated API request
async function apiRequest(endpoint, options = {}) {
    const token = getToken();
    if (!token) {
        window.location.href = 'login.html';
        throw new Error('Not authenticated');
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
        ...options,
        headers: {
            ...options.headers,
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 401) {
        clearToken();
        window.location.href = 'login.html';
        throw new Error('Session expired');
    }

    return response;
}

// Check authentication on page load
if (!getToken()) {
    window.location.href = 'login.html';
}

// State
let currentUser = null;
let currentUsage = null;
let apiKeys = [];

// Load user data
async function loadUserData() {
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

// Load usage data
async function loadUsageData() {
    try {
        const response = await apiRequest('/usage/current');
        const data = await response.json();
        
        if (data.success) {
            currentUsage = data;
            
            // Update stats
            document.getElementById('totalRequests').textContent = data.usage.total_requests;
            document.getElementById('piiDetections').textContent = data.usage.total_pii_detections;
            
            // Update quota
            document.getElementById('usedRequests').textContent = data.quota.current;
            document.getElementById('limitRequests').textContent = 
                data.quota.limit === Infinity ? '∞' : data.quota.limit;
            
            const percentage = data.quota.percentage;
            document.getElementById('quotaPercentage').textContent = percentage + '%';
            document.getElementById('quotaBar').style.width = Math.min(percentage, 100) + '%';
            
            if (data.quota.exceeded) {
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

// Load API keys
async function loadAPIKeys() {
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

// Render API keys
function renderAPIKeys() {
    const container = document.getElementById('keysContainer');
    
    if (apiKeys.length === 0) {
        container.innerHTML = `
            <div class="terminal">
                <div class="terminal-body">
                    <p class="comment">No API keys yet. Create one to get started!</p>
                </div>
            </div>
        `;
        return;
    }
    
    container.innerHTML = apiKeys.map(key => `
        <div class="key-card">
            <div class="key-header">
                <div>
                    <div class="key-name">${key.name || 'Unnamed Key'}</div>
                    ${key.description ? `<div class="key-description">${key.description}</div>` : ''}
                </div>
                <div class="key-actions">
                    <button class="btn btn-secondary btn-sm" onclick="revokeKey('${key.id}')">REVOKE</button>
                </div>
            </div>
            <div class="key-prefix">${key.key_prefix}••••••••••••••••</div>
            <div class="key-meta">
                <div class="key-meta-item">
                    <span class="key-meta-label comment">Created:</span>
                    <span class="key-meta-value">${new Date(key.created_at).toLocaleDateString()}</span>
                </div>
                <div class="key-meta-item">
                    <span class="key-meta-label comment">Last Used:</span>
                    <span class="key-meta-value">${key.last_used_at ? new Date(key.last_used_at).toLocaleDateString() : 'Never'}</span>
                </div>
                <div class="key-meta-item">
                    <span class="key-meta-label comment">Requests:</span>
                    <span class="key-meta-value">${key.total_requests || 0}</span>
                </div>
                <div class="key-meta-item">
                    <span class="key-meta-label comment">Status:</span>
                    <span class="key-meta-value success-text">${key.status.toUpperCase()}</span>
                </div>
            </div>
        </div>
    `).join('');
}

// Create API key
document.getElementById('createKeyBtn').addEventListener('click', () => {
    document.getElementById('createKeyModal').classList.add('active');
});

document.getElementById('cancelKeyBtn').addEventListener('click', () => {
    document.getElementById('createKeyModal').classList.remove('active');
    document.getElementById('createKeyForm').reset();
});

document.getElementById('createKeyForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    const data = {
        name: formData.get('name'),
        description: formData.get('description'),
        environment: 'production'
    };
    
    try {
        const response = await apiRequest('/keys', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Show the key (only time it's shown!)
            alert(`API Key Created!\n\nKEY: ${result.key.key}\n\nSave this now - it won't be shown again!`);
            
            // Close modal and reload keys
            document.getElementById('createKeyModal').classList.remove('active');
            document.getElementById('createKeyForm').reset();
            await loadAPIKeys();
        }
    } catch (error) {
        alert('Failed to create API key: ' + error.message);
    }
});

// Revoke API key
async function revokeKey(keyId) {
    if (!confirm('Are you sure you want to revoke this API key? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await apiRequest(`/keys/${keyId}`, {
            method: 'DELETE',
            body: JSON.stringify({ reason: 'User requested' })
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('API key revoked successfully');
            await loadAPIKeys();
        }
    } catch (error) {
        alert('Failed to revoke API key: ' + error.message);
    }
}

// Load usage details
async function loadUsageDetails() {
    try {
        const response = await apiRequest('/usage/daily');
        const data = await response.json();
        
        if (data.success && data.daily.length > 0) {
            const html = data.daily.map(day => `
                <div class="usage-row">
                    <span class="usage-label">${new Date(day.date).toLocaleDateString()}</span>
                    <span class="usage-value">${day.requests} requests (${day.pii_detections} PII)</span>
                </div>
            `).join('');
            
            document.getElementById('usageDetails').innerHTML = html;
        } else {
            document.getElementById('usageDetails').innerHTML = '<p class="comment">No usage data yet</p>';
        }
    } catch (error) {
        console.error('Failed to load usage details:', error);
    }
}

// Load billing info
async function loadBillingInfo() {
    try {
        const response = await apiRequest('/billing/subscription');
        const data = await response.json();
        
        if (data.success) {
            const plan = data.plan || 'free';
            const subscription = data.subscription;
            
            let html = `
                <div class="usage-row">
                    <span class="usage-label">Current Plan:</span>
                    <span class="usage-value success-text">${plan.toUpperCase()}</span>
                </div>
            `;
            
            if (subscription) {
                html += `
                    <div class="usage-row">
                        <span class="usage-label">Status:</span>
                        <span class="usage-value">${subscription.status}</span>
                    </div>
                    <div class="usage-row">
                        <span class="usage-label">Renews:</span>
                        <span class="usage-value">${new Date(subscription.current_period_end * 1000).toLocaleDateString()}</span>
                    </div>
                `;
                
                document.getElementById('portalBtn').style.display = 'inline-block';
            }
            
            if (plan === 'free') {
                document.getElementById('upgradeBtn').style.display = 'inline-block';
            }
            
            document.getElementById('billingInfo').innerHTML = html;
        }
    } catch (error) {
        console.error('Failed to load billing:', error);
    }
}

// Handle billing actions
document.getElementById('upgradeBtn').addEventListener('click', () => {
    window.location.href = '../docs/index.html#pricing';
});

document.getElementById('portalBtn').addEventListener('click', async () => {
    try {
        const response = await apiRequest('/billing/portal', {
            method: 'POST'
        });
        
        const data = await response.json();
        
        if (data.success) {
            window.location.href = data.url;
        }
    } catch (error) {
        alert('Failed to open billing portal: ' + error.message);
    }
});

// Handle account form
document.getElementById('accountForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        name: document.getElementById('accountName').value,
        company: document.getElementById('accountCompany').value
    };
    
    try {
        const response = await apiRequest('/auth/me', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Profile updated successfully');
            await loadUserData();
        }
    } catch (error) {
        alert('Failed to update profile: ' + error.message);
    }
});

// Handle password change
document.getElementById('passwordForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const data = {
        currentPassword: document.getElementById('currentPassword').value,
        newPassword: document.getElementById('newPassword').value
    };
    
    try {
        const response = await apiRequest('/auth/change-password', {
            method: 'POST',
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (result.success) {
            alert('Password changed successfully');
            document.getElementById('passwordForm').reset();
        }
    } catch (error) {
        alert('Failed to change password: ' + error.message);
    }
});

// Handle logout
document.getElementById('logoutBtn').addEventListener('click', () => {
    if (confirm('Are you sure you want to log out?')) {
        clearToken();
        window.location.href = 'login.html';
    }
});

// Navigation
document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', (e) => {
        e.preventDefault();
        
        const section = item.dataset.section;
        
        // Update nav
        document.querySelectorAll('.nav-item').forEach(nav => nav.classList.remove('active'));
        item.classList.add('active');
        
        // Update sections
        document.querySelectorAll('.dashboard-section').forEach(sec => sec.classList.remove('active'));
        document.getElementById(`section-${section}`).classList.add('active');
        
        // Load data for section
        if (section === 'usage') {
            loadUsageDetails();
        } else if (section === 'billing') {
            loadBillingInfo();
        }
    });
});

// Initialize dashboard
async function initDashboard() {
    await loadUserData();
    await loadUsageData();
    await loadAPIKeys();
}

// Load data on page load
initDashboard();
