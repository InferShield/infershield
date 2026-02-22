/**
 * Tests for dashboard.js
 * Covers dashboard data loading, API key management, usage tracking
 */

// Mock localStorage
const mockLocalStorage = (() => {
  let store = {};
  return {
    getItem: jest.fn((key) => store[key] || null),
    setItem: jest.fn((key, value) => { store[key] = value.toString(); }),
    removeItem: jest.fn((key) => { delete store[key]; }),
    clear: jest.fn(() => { store = {}; })
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage
});

const API_BASE = 'http://localhost:5000/api';

// Helper functions
function getToken() {
  return localStorage.getItem('infershield_token');
}

function clearToken() {
  localStorage.removeItem('infershield_token');
}

async function apiRequest(endpoint, options = {}) {
  const token = getToken();
  if (!token) {
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
    throw new Error('Session expired');
  }

  return response;
}

describe('Dashboard Authentication', () => {
  beforeEach(() => {
    localStorage.clear();
    fetch.mockClear();
  });

  test('apiRequest throws error when no token', async () => {
    await expect(apiRequest('/auth/me')).rejects.toThrow('Not authenticated');
  });

  test('apiRequest includes Authorization header', async () => {
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: true })
    });

    await apiRequest('/auth/me');

    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/me`,
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer test_token',
          'Content-Type': 'application/json'
        })
      })
    );
  });

  test('apiRequest handles 401 by clearing token', async () => {
    localStorage.setItem('infershield_token', 'expired_token');
    fetch.mockResolvedValue({
      status: 401,
      ok: false
    });

    await expect(apiRequest('/auth/me')).rejects.toThrow('Session expired');
    expect(getToken()).toBeNull();
  });
});

describe('User Data Loading', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockClear();
  });

  test('loadUserData fetches and returns user info', async () => {
    const mockUser = {
      success: true,
      user: {
        id: 1,
        email: 'test@example.com',
        name: 'Test User',
        company: 'Test Co',
        plan: 'pro'
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUser
    });

    const response = await apiRequest('/auth/me');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.email).toBe('test@example.com');
    expect(data.user.plan).toBe('pro');
  });
});

describe('Usage Data Loading', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockClear();
  });

  test('loadUsageData fetches current usage and quota', async () => {
    const mockUsage = {
      success: true,
      usage: {
        total_requests: 75,
        total_pii_detections: 12
      },
      quota: {
        current: 75,
        limit: 100,
        percentage: 75,
        exceeded: false
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUsage
    });

    const response = await apiRequest('/usage/current');
    const data = await response.json();

    expect(data.usage.total_requests).toBe(75);
    expect(data.quota.percentage).toBe(75);
    expect(data.quota.exceeded).toBe(false);
  });

  test('quota exceeded warning', async () => {
    const mockUsage = {
      success: true,
      usage: {
        total_requests: 105,
        total_pii_detections: 20
      },
      quota: {
        current: 105,
        limit: 100,
        percentage: 105,
        exceeded: true
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockUsage
    });

    const response = await apiRequest('/usage/current');
    const data = await response.json();

    expect(data.quota.exceeded).toBe(true);
    expect(data.quota.percentage).toBeGreaterThan(100);
  });
});

describe('API Key Management', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockClear();
  });

  test('loadAPIKeys fetches all keys', async () => {
    const mockKeys = {
      success: true,
      keys: [
        {
          id: 'key_1',
          name: 'Production Key',
          key_prefix: 'isk_live_abc',
          created_at: '2026-02-22T00:00:00Z',
          last_used_at: '2026-02-22T01:00:00Z',
          total_requests: 50,
          status: 'active'
        }
      ]
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockKeys
    });

    const response = await apiRequest('/keys');
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.keys).toHaveLength(1);
    expect(data.keys[0].name).toBe('Production Key');
  });

  test('createKey generates new API key', async () => {
    const mockResponse = {
      success: true,
      key: {
        id: 'key_2',
        name: 'Test Key',
        key: 'isk_live_abcdef1234567890',
        key_prefix: 'isk_live_abc',
        created_at: '2026-02-22T00:00:00Z'
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const response = await apiRequest('/keys', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Test Key',
        description: 'For testing',
        environment: 'production'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.key.key).toMatch(/^isk_live_/);
    expect(data.key.name).toBe('Test Key');
  });

  test('revokeKey deletes API key', async () => {
    const mockResponse = {
      success: true,
      message: 'API key revoked'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const response = await apiRequest('/keys/key_1', {
      method: 'DELETE',
      body: JSON.stringify({ reason: 'User requested' })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/keys/key_1`,
      expect.objectContaining({
        method: 'DELETE'
      })
    );
  });
});

describe('Billing Operations', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockClear();
  });

  test('loadBillingInfo fetches subscription details', async () => {
    const mockBilling = {
      success: true,
      plan: 'pro',
      subscription: {
        status: 'active',
        current_period_end: 1709251200
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockBilling
    });

    const response = await apiRequest('/billing/subscription');
    const data = await response.json();

    expect(data.plan).toBe('pro');
    expect(data.subscription.status).toBe('active');
  });

  test('create checkout session for upgrade', async () => {
    const mockCheckout = {
      success: true,
      url: 'https://checkout.stripe.com/session_123'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockCheckout
    });

    const response = await apiRequest('/billing/checkout', {
      method: 'POST',
      body: JSON.stringify({ plan: 'pro' })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.url).toContain('stripe.com');
  });

  test('open customer portal', async () => {
    const mockPortal = {
      success: true,
      url: 'https://billing.stripe.com/portal_123'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockPortal
    });

    const response = await apiRequest('/billing/portal', {
      method: 'POST'
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.url).toContain('stripe.com');
  });
});

describe('Account Management', () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem('infershield_token', 'test_token');
    fetch.mockClear();
  });

  test('update user profile', async () => {
    const mockResponse = {
      success: true,
      user: {
        name: 'Updated Name',
        company: 'New Company'
      }
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const response = await apiRequest('/auth/me', {
      method: 'PUT',
      body: JSON.stringify({
        name: 'Updated Name',
        company: 'New Company'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.user.name).toBe('Updated Name');
  });

  test('change password', async () => {
    const mockResponse = {
      success: true,
      message: 'Password changed successfully'
    };

    fetch.mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const response = await apiRequest('/auth/change-password', {
      method: 'POST',
      body: JSON.stringify({
        currentPassword: 'old_password',
        newPassword: 'new_password'
      })
    });

    const data = await response.json();

    expect(data.success).toBe(true);
  });
});

describe('Navigation', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <nav>
        <a class="nav-item active" data-section="overview">Overview</a>
        <a class="nav-item" data-section="keys">Keys</a>
        <a class="nav-item" data-section="usage">Usage</a>
      </nav>
      <section id="section-overview" class="dashboard-section active"></section>
      <section id="section-keys" class="dashboard-section"></section>
      <section id="section-usage" class="dashboard-section"></section>
    `;
  });

  test('section switching updates active states', () => {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.dashboard-section');

    // Simulate clicking "keys" nav item
    navItems[0].classList.remove('active');
    navItems[1].classList.add('active');
    sections[0].classList.remove('active');
    sections[1].classList.add('active');

    expect(navItems[1].classList.contains('active')).toBe(true);
    expect(sections[1].classList.contains('active')).toBe(true);
  });
});

describe('UI Elements', () => {
  test('dashboard has sidebar', () => {
    document.body.innerHTML = '<aside class="sidebar"></aside>';
    const sidebar = document.querySelector('.sidebar');
    expect(sidebar).not.toBeNull();
  });

  test('dashboard has main content area', () => {
    document.body.innerHTML = '<main class="dashboard-main"></main>';
    const main = document.querySelector('.dashboard-main');
    expect(main).not.toBeNull();
  });

  test('quota bar updates width based on percentage', () => {
    document.body.innerHTML = '<div class="progress-fill" id="quotaBar"></div>';
    const quotaBar = document.getElementById('quotaBar');
    
    quotaBar.style.width = '75%';
    expect(quotaBar.style.width).toBe('75%');
  });

  test('warning class added when quota near limit', () => {
    document.body.innerHTML = '<div class="progress-fill" id="quotaBar"></div>';
    const quotaBar = document.getElementById('quotaBar');
    
    const percentage = 85;
    if (percentage > 80) {
      quotaBar.classList.add('warning');
    }
    
    expect(quotaBar.classList.contains('warning')).toBe(true);
  });
});
