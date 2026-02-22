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

// Show error message
function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.classList.add('visible');
    }
}

// Hide error message
function hideError() {
    const errorEl = document.getElementById('errorMessage');
    if (errorEl) {
        errorEl.classList.remove('visible');
    }
}

// Store token
function setToken(token) {
    localStorage.setItem('infershield_token', token);
}

// Get token
function getToken() {
    return localStorage.getItem('infershield_token');
}

// Clear token
function clearToken() {
    localStorage.removeItem('infershield_token');
}

// Check if logged in
function isLoggedIn() {
    return !!getToken();
}

// Handle login form
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'LOGGING IN...';

        const formData = {
            email: document.getElementById('email').value,
            password: document.getElementById('password').value
        };

        try {
            const response = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Login failed');
            }

            // Store token
            setToken(data.token);

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            showError(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'LOGIN';
        }
    });
}

// Handle signup form
if (document.getElementById('signupForm')) {
    document.getElementById('signupForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError();

        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (password !== confirmPassword) {
            showError('Passwords do not match');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        submitBtn.disabled = true;
        submitBtn.textContent = 'CREATING ACCOUNT...';

        const formData = {
            email: document.getElementById('email').value,
            password: password,
            name: document.getElementById('name').value,
            company: document.getElementById('company').value
        };

        try {
            const response = await fetch(`${API_BASE}/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Signup failed');
            }

            // Show success message
            alert('Account created successfully! Logging you in...');

            // Auto-login
            const loginResponse = await fetch(`${API_BASE}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: formData.email,
                    password: formData.password
                })
            });

            const loginData = await loginResponse.json();

            if (!loginResponse.ok) {
                throw new Error('Account created but login failed. Please login manually.');
            }

            // Store token
            setToken(loginData.token);
            
            // Clear demo mode if it was active
            if (window.InferShieldDemoMode && window.InferShieldDemoMode.isActive()) {
                localStorage.removeItem('infershield_demo_mode');
                localStorage.removeItem('infershield_demo_activated_at');
                localStorage.removeItem('infershield_demo_data');
                console.log('[InferShield] Demo mode cleared after signup');
            }

            // Redirect to dashboard
            window.location.href = 'dashboard.html';

        } catch (error) {
            showError(error.message);
            submitBtn.disabled = false;
            submitBtn.textContent = 'CREATE ACCOUNT';
        }
    });
}
