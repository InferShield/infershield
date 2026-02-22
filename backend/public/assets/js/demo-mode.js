/**
 * InferShield Demo Mode
 * Provides a "Try Example" experience with pre-configured sample data
 * No API key or authentication required
 */

const DEMO_MODE_KEY = 'infershield_demo_mode';
const DEMO_DATA_PATH = '/assets/mock/demo-data.json';

// Check if demo mode is active
function isDemoMode() {
  return localStorage.getItem(DEMO_MODE_KEY) === 'true';
}

// Activate demo mode
function activateDemoMode() {
  localStorage.setItem(DEMO_MODE_KEY, 'true');
  console.log('[InferShield] Demo mode activated');
  
  // Store demo activation timestamp
  localStorage.setItem('infershield_demo_activated_at', Date.now().toString());
  
  // Redirect to dashboard
  window.location.href = '/dashboard.html';
}

// Deactivate demo mode
function deactivateDemoMode() {
  localStorage.removeItem(DEMO_MODE_KEY);
  localStorage.removeItem('infershield_demo_activated_at');
  localStorage.removeItem('infershield_demo_data');
  console.log('[InferShield] Demo mode deactivated');
  
  // Redirect to login
  window.location.href = '/login.html';
}

// Load demo data
async function loadDemoData() {
  try {
    // Check if data is cached
    const cached = localStorage.getItem('infershield_demo_data');
    if (cached) {
      console.log('[InferShield] Loading cached demo data');
      return JSON.parse(cached);
    }
    
    // Fetch from server
    console.log('[InferShield] Fetching demo data from server');
    const response = await fetch(DEMO_DATA_PATH);
    
    if (!response.ok) {
      throw new Error(`Failed to load demo data: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Cache it
    localStorage.setItem('infershield_demo_data', JSON.stringify(data));
    
    return data;
  } catch (error) {
    console.error('[InferShield] Failed to load demo data:', error);
    
    // Fallback to minimal demo data if fetch fails
    return {
      user: {
        name: 'Demo User',
        email: 'demo@infershield.io',
        plan: 'PRO'
      },
      stats: {
        totalRequests: 487,
        quotaUsed: 487,
        quotaLimit: 10000,
        quotaPercentage: 4.87,
        piiDetections: 23
      },
      apiKeys: [],
      usage: { daily: [], monthly: {} },
      recentScans: []
    };
  }
}

// Get demo data for specific section
async function getDemoData(section = null) {
  if (!isDemoMode()) {
    return null;
  }
  
  const data = await loadDemoData();
  
  if (section) {
    return data[section];
  }
  
  return data;
}

// Show demo mode indicator
function showDemoIndicator() {
  if (!isDemoMode()) return;
  
  // Create demo mode banner
  const banner = document.createElement('div');
  banner.id = 'demoBanner';
  banner.className = 'demo-banner';
  banner.innerHTML = `
    <div class="demo-banner-content">
      <span class="demo-badge">
        <span class="prompt">🎭</span> DEMO MODE
      </span>
      <span class="demo-text comment">
        // Exploring with sample data. 
        <a href="#" id="exitDemoBtn" class="link">Exit Demo</a>
        or
        <a href="/signup.html" class="link">Sign Up</a>
      </span>
    </div>
  `;
  
  // Insert at top of page
  document.body.insertBefore(banner, document.body.firstChild);
  
  // Add exit demo handler
  document.getElementById('exitDemoBtn').addEventListener('click', (e) => {
    e.preventDefault();
    if (confirm('Exit demo mode? You\'ll be redirected to the login page.')) {
      deactivateDemoMode();
    }
  });
  
  console.log('[InferShield] Demo mode indicator shown');
}

// Initialize demo mode on dashboard
function initDemoMode() {
  if (!isDemoMode()) {
    return false;
  }
  
  console.log('[InferShield] Initializing demo mode');
  
  // Show indicator
  showDemoIndicator();
  
  // Override API calls to use demo data
  window.InferShieldDemo = {
    isActive: true,
    getData: getDemoData,
    exit: deactivateDemoMode
  };
  
  return true;
}

// Add "Try Example" button to auth pages
function addTryExampleButton() {
  // Check if we're on login or signup page
  const loginForm = document.getElementById('loginForm');
  const signupForm = document.getElementById('signupForm');
  
  if (!loginForm && !signupForm) {
    return; // Not on auth page
  }
  
  const form = loginForm || signupForm;
  const authLinks = form.parentElement.querySelector('.auth-links');
  
  if (!authLinks) {
    console.warn('[InferShield] Could not find auth-links container');
    return;
  }
  
  // Create "Try Example" section
  const tryExampleSection = document.createElement('div');
  tryExampleSection.className = 'try-example-section';
  tryExampleSection.innerHTML = `
    <div class="divider">
      <span class="divider-text comment">// OR</span>
    </div>
    <button type="button" id="tryExampleBtn" class="btn btn-secondary btn-full">
      <span class="prompt">🎭</span> TRY EXAMPLE
    </button>
    <p class="try-example-hint comment">
      // Explore with sample data - no account needed
    </p>
  `;
  
  // Insert before auth-links
  authLinks.parentElement.insertBefore(tryExampleSection, authLinks);
  
  // Add click handler
  document.getElementById('tryExampleBtn').addEventListener('click', (e) => {
    e.preventDefault();
    activateDemoMode();
  });
  
  console.log('[InferShield] "Try Example" button added');
}

// Auto-initialize based on page context
document.addEventListener('DOMContentLoaded', () => {
  // If on dashboard and demo mode is active
  if (window.location.pathname.includes('dashboard.html')) {
    if (isDemoMode()) {
      initDemoMode();
    }
  }
  
  // If on auth pages, add "Try Example" button
  if (window.location.pathname.includes('login.html') || 
      window.location.pathname.includes('signup.html')) {
    addTryExampleButton();
  }
});

// Export for use in other scripts
window.InferShieldDemoMode = {
  isActive: isDemoMode,
  activate: activateDemoMode,
  deactivate: deactivateDemoMode,
  getData: getDemoData,
  init: initDemoMode
};
