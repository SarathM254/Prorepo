/**
 * Login Page JavaScript
 * Handles login and registration functionality
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

/**
 * Handles user login
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function login(email, password) {
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');
    
    loginBtn.disabled = true;
    loading.style.display = 'block';
    clearErrors();

    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store auth token in localStorage
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            window.location.href = '/index.html';
        } else {
            if (response.status === 404) {
                showError(data.error, 'email');
            } else if (response.status === 401) {
                showError(data.error, 'password');
            } else {
                showError(data.error || 'Login failed');
            }
        }
    } catch (error) {
        console.error('Login error:', error);
        showError('Network error. Please try again.');
    } finally {
        loginBtn.disabled = false;
        loading.style.display = 'none';
    }
}

/**
 * Handles user registration
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - User password
 */
async function register(name, email, password) {
    const registerBtn = document.getElementById('registerSubmitBtn');
    const loading = document.getElementById('regLoading');
    
    registerBtn.disabled = true;
    loading.style.display = 'block';
    clearErrors();

    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            // Store auth token in localStorage
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            document.querySelector('.login-container').innerHTML = `
                <div class="logo">
                    <h1>Proto</h1>
                    <p>Account Created Successfully!</p>
                </div>
                <div class="success-message" style="display: block;">
                    <i class="fas fa-check-circle"></i> Welcome to Proto! Redirecting...
                </div>
            `;
            
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
        } else {
            showError(data.error || 'Registration failed', 'regEmail');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showError('Network error. Please try again.');
    } finally {
        registerBtn.disabled = false;
        loading.style.display = 'none';
    }
}

/**
 * Shows the registration form
 */
function showRegisterForm() {
    const container = document.querySelector('.login-container');
    container.innerHTML = `
        <div class="logo">
            <h1>Proto</h1>
            <p>Create Your Account</p>
        </div>

        <form id="registerForm">
            <div class="form-group">
                <label for="regName">Full Name</label>
                <input type="text" id="regName" name="name" required>
                <div class="error-message" id="regNameError"></div>
            </div>

            <div class="form-group">
                <label for="regEmail">Email</label>
                <input type="email" id="regEmail" name="email" required>
                <div class="error-message" id="regEmailError"></div>
            </div>

            <div class="form-group">
                <label for="regPassword">Password</label>
                <input type="password" id="regPassword" name="password" required>
                <div class="error-message" id="regPasswordError"></div>
            </div>

            <button type="submit" class="login-btn" id="registerSubmitBtn">
                <i class="fas fa-user-plus"></i> Create Account
            </button>

            <div class="loading" id="regLoading">
                <div class="spinner"></div>
                <p>Creating account...</p>
            </div>
        </form>

        <div class="divider">
            <span>or</span>
        </div>

        <button class="register-btn" id="backToLoginBtn">
            <i class="fas fa-arrow-left"></i> Back to Login
        </button>
    `;

    // Add event listeners for register form
    document.getElementById('registerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('regName').value;
        const email = document.getElementById('regEmail').value;
        const password = document.getElementById('regPassword').value;
        
        if (!name || !email || !password) {
            showError('Please fill in all fields');
            return;
        }

        await register(name, email, password);
    });

    document.getElementById('backToLoginBtn').addEventListener('click', () => {
        location.reload();
    });
}

/**
 * Shows an error message
 * @param {string} message - Error message
 * @param {string} fieldId - Field ID to highlight (optional)
 */
function showError(message, fieldId = null) {
    const generalErrorDiv = document.createElement('div');
    generalErrorDiv.className = 'error-message-general';
    generalErrorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
    
    const form = document.querySelector('form');
    form.insertBefore(generalErrorDiv, form.firstChild);
    
    if (fieldId) {
        const errorField = document.getElementById(`${fieldId}Error`);
        const inputField = document.getElementById(fieldId);
        if (errorField && inputField) {
            errorField.textContent = message;
            errorField.style.display = 'block';
            inputField.classList.add('error');
        }
    }
    
    setTimeout(() => {
        generalErrorDiv.remove();
    }, 5000);
}

/**
 * Clears all error messages
 */
function clearErrors() {
    document.querySelectorAll('.error-message-general').forEach(e => e.remove());
    document.querySelectorAll('.error-message').forEach(e => {
        e.textContent = '';
        e.style.display = 'none';
    });
    document.querySelectorAll('input.error').forEach(e => e.classList.remove('error'));
}

// Initialize login page
document.addEventListener('DOMContentLoaded', () => {
    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please fill in all fields');
                return;
            }

            await login(email, password);
        });
    }

    // Register button click
    const registerBtn = document.getElementById('registerBtn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => {
            showRegisterForm();
        });
    }
});

