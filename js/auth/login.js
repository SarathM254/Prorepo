/**
 * Login Page JavaScript
 * Handles both email/password and Google OAuth login
 */

/**
 * Checks if user is authenticated
 */
async function checkAuthStatus() {
    const authToken = localStorage.getItem('authToken');
    
    if (!authToken) {
        return; // Not logged in, stay on login page
    }
    
    try {
        const response = await fetch('/api/auth/status', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        
        if (data.authenticated) {
            window.location.href = '/index.html';
        } else {
            localStorage.removeItem('authToken');
        }
    } catch (error) {
        console.error('Auth check failed:', error);
        localStorage.removeItem('authToken');
    }
}

// Check auth status on page load
checkAuthStatus();

// Handle Google OAuth callback (token in URL)
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
        localStorage.setItem('authToken', token);
        window.location.href = '/index.html';
        return;
    }
    
    if (error) {
        showError(decodeURIComponent(error));
    }

    // Setup form toggle
    setupFormToggle();
    
    // Setup password toggle
    setupPasswordToggle();

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            
            await login(email, password);
        });
    }

    // Google login button
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }
});

/**
 * Handles Google OAuth login - redirects to Google
 */
function handleGoogleLogin() {
    // Redirect to Google OAuth endpoint
    window.location.href = '/api/auth/google';
}

/**
 * Handles email/password login
 */
async function login(email, password) {
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');
    const loginBtnText = document.getElementById('loginBtnText');
    
    loginBtn.disabled = true;
    loading.style.display = 'inline-block';
    loginBtnText.textContent = 'Signing in...';
    clearErrors();
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store token
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            // Redirect to home
            window.location.href = '/index.html';
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to login. Please check your credentials.');
        loginBtn.disabled = false;
        loading.style.display = 'none';
        loginBtnText.textContent = 'Sign In';
    }
}

/**
 * Handles form toggle
 */
function setupFormToggle() {
    const emailToggle = document.getElementById('emailLoginToggle');
    const googleToggle = document.getElementById('googleLoginToggle');
    const emailForm = document.getElementById('emailLoginForm');
    const googleSection = document.getElementById('googleLoginSection');
    
    if (emailToggle && googleToggle) {
        emailToggle.addEventListener('click', () => {
            emailToggle.classList.add('active');
            googleToggle.classList.remove('active');
            emailForm.style.display = 'block';
            googleSection.style.display = 'none';
        });
        
        googleToggle.addEventListener('click', () => {
            googleToggle.classList.add('active');
            emailToggle.classList.remove('active');
            emailForm.style.display = 'none';
            googleSection.style.display = 'block';
        });
    }
}

/**
 * Clears error messages
 */
function clearErrors() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

/**
 * Sets up password toggle visibility
 */
function setupPasswordToggle() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('passwordToggle');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
    if (passwordInput && toggleBtn && toggleIcon) {
        toggleBtn.addEventListener('click', () => {
            const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            
            if (type === 'text') {
                toggleIcon.classList.remove('fa-eye');
                toggleIcon.classList.add('fa-eye-slash');
            } else {
                toggleIcon.classList.remove('fa-eye-slash');
                toggleIcon.classList.add('fa-eye');
            }
        });
    }
}

/**
 * Shows an error message
 * @param {string} message - Error message
 */
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        // Fallback: create error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message-general';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        errorDiv.style.cssText = 'display: block; background: #fee2e2; color: #991b1b; padding: 1rem; border-radius: 8px; margin: 1rem 0;';
        
        const container = document.querySelector('.login-container');
        if (container) {
            container.insertBefore(errorDiv, container.firstChild);
        }
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
}

