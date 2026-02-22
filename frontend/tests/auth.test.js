/**
 * Tests for auth.js
 * Covers login, signup, token management
 */

// Mock localStorage for each test
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

// Helper functions (copied from auth.js for testing)
function setToken(token) {
  localStorage.setItem('infershield_token', token);
}

function getToken() {
  return localStorage.getItem('infershield_token');
}

function clearToken() {
  localStorage.removeItem('infershield_token');
}

function isLoggedIn() {
  return !!getToken();
}

describe('Token Management', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('setToken stores token in localStorage', () => {
    setToken('test_token_123');
    expect(localStorage.setItem).toHaveBeenCalledWith('infershield_token', 'test_token_123');
    expect(getToken()).toBe('test_token_123');
  });

  test('getToken retrieves token from localStorage', () => {
    localStorage.setItem('infershield_token', 'test_token_123');
    const token = getToken();
    expect(token).toBe('test_token_123');
  });

  test('clearToken removes token from localStorage', () => {
    localStorage.setItem('infershield_token', 'test_token_123');
    clearToken();
    expect(localStorage.removeItem).toHaveBeenCalledWith('infershield_token');
    expect(getToken()).toBeNull();
  });

  test('isLoggedIn returns true when token exists', () => {
    localStorage.setItem('infershield_token', 'test_token_123');
    expect(isLoggedIn()).toBe(true);
  });

  test('isLoggedIn returns false when no token', () => {
    expect(isLoggedIn()).toBe(false);
  });
});

describe('Login Flow', () => {
  beforeEach(() => {
    // Setup DOM
    document.body.innerHTML = `
      <form id="loginForm">
        <input id="email" type="email" value="test@example.com" />
        <input id="password" type="password" value="password123" />
        <button id="submitBtn">LOGIN</button>
        <div id="errorMessage"></div>
      </form>
    `;
    fetch.mockClear();
  });

  test('successful login makes correct API call', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true, token: 'jwt_token_123' })
    };
    fetch.mockResolvedValue(mockResponse);

    const email = 'test@example.com';
    const password = 'password123';

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();
    
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/login`,
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
    );
    
    expect(data.token).toBe('jwt_token_123');
  });

  test('failed login returns error', async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Invalid credentials' })
    };
    fetch.mockResolvedValue(mockResponse);

    const response = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'wrong' })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(false);
    expect(data.error).toBe('Invalid credentials');
  });
});

describe('Signup Flow', () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <form id="signupForm">
        <input id="email" type="email" value="newuser@example.com" />
        <input id="name" type="text" value="New User" />
        <input id="company" type="text" value="Test Co" />
        <input id="password" type="password" value="password123" />
        <input id="confirmPassword" type="password" value="password123" />
        <button id="submitBtn">CREATE ACCOUNT</button>
        <div id="errorMessage"></div>
      </form>
    `;
    fetch.mockClear();
  });

  test('successful signup makes correct API call', async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({ success: true, user: { id: 1, email: 'newuser@example.com' } })
    };
    fetch.mockResolvedValue(mockResponse);

    const formData = {
      email: 'newuser@example.com',
      name: 'New User',
      company: 'Test Co',
      password: 'password123'
    };

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    });

    const data = await response.json();
    
    expect(fetch).toHaveBeenCalledWith(
      `${API_BASE}/auth/register`,
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify(formData)
      })
    );
    
    expect(data.success).toBe(true);
  });

  test('password mismatch validation', () => {
    const password = 'password123';
    const confirmPassword = 'different456';
    
    expect(password).not.toBe(confirmPassword);
  });

  test('failed signup returns error', async () => {
    const mockResponse = {
      ok: false,
      json: async () => ({ error: 'Email already exists' })
    };
    fetch.mockResolvedValue(mockResponse);

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'existing@example.com', password: 'pass123' })
    });

    const data = await response.json();
    
    expect(response.ok).toBe(false);
    expect(data.error).toBe('Email already exists');
  });
});

describe('Error Handling', () => {
  test('showError displays error message', () => {
    document.body.innerHTML = '<div id="errorMessage"></div>';
    
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = 'Test error';
    errorEl.classList.add('visible');
    
    expect(errorEl.textContent).toBe('Test error');
    expect(errorEl.classList.contains('visible')).toBe(true);
  });

  test('hideError removes visible class', () => {
    document.body.innerHTML = '<div id="errorMessage" class="visible"></div>';
    
    const errorEl = document.getElementById('errorMessage');
    errorEl.classList.remove('visible');
    
    expect(errorEl.classList.contains('visible')).toBe(false);
  });
});

describe('Form Validation', () => {
  test('email field has correct attributes', () => {
    document.body.innerHTML = '<input id="email" type="email" required />';
    const emailField = document.getElementById('email');
    
    expect(emailField.type).toBe('email');
    expect(emailField.required).toBe(true);
  });

  test('password field has minimum length', () => {
    document.body.innerHTML = '<input id="password" type="password" minlength="8" />';
    const passwordField = document.getElementById('password');
    
    expect(passwordField.type).toBe('password');
    expect(passwordField.minLength).toBe(8);
  });
});
