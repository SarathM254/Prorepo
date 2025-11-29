/**
 * Login Page JavaScript
 * Handles both email/password and Google OAuth login
 */

/**
 * Checks if user is authenticated
 */
async function checkAuthStatus() {
    // Check if we're on localhost (local development)
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
    
    // Prepare request options
    const requestOptions = {
        credentials: 'include' // Always include cookies (works for both local and production)
    };
    
    // For production, also include Bearer token if available
    if (!isLocalhost) {
        const authToken = localStorage.getItem('authToken');
        if (authToken) {
            requestOptions.headers = {
                'Authorization': `Bearer ${authToken}`
            };
        }
    }
    
    try {
        const response = await fetch('/api/auth/status', requestOptions);
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type') || '';
        let data;
        
        try {
            if (contentType.includes('application/json')) {
                data = await response.json();
            } else {
                // Response is not JSON - might be HTML error page
                const text = await response.text();
                console.error('Non-JSON response in auth check:', {
                    status: response.status,
                    contentType: contentType,
                    preview: text.substring(0, 200)
                });
                return;
            }
        } catch (error) {
            console.error('Auth check response parsing failed:', error);
            return;
        }
        
        if (data.authenticated) {
            // Only redirect if we're on the login page
            if (window.location.pathname.includes('login')) {
                window.location.href = '/index.html';
            }
            // If already on index.html or another page, don't redirect
        } else {
            // Clear token if not authenticated (production)
            if (!isLocalhost) {
                localStorage.removeItem('authToken');
            }
        }
    } catch (error) {
        console.error('Auth check failed:', error);
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

    // Ensure both sections are visible (no toggle needed)
    const emailForm = document.getElementById('emailLoginForm');
    const googleSection = document.querySelector('.google-login-section');
    
    if (emailForm) emailForm.style.display = 'block';
    if (googleSection) googleSection.style.display = 'block';
    
    // Setup password toggle
    setupPasswordToggle();

    // Login/Register form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formMode = loginForm.getAttribute('data-mode') || 'login';
            
            if (formMode === 'register') {
                // Registration mode
                const name = document.getElementById('registerName')?.value.trim();
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                if (!name || !email || !password) {
                    showError('Please fill in all fields');
                    return;
                }
                
                if (password.length < 6) {
                    showError('Password must be at least 6 characters long');
                    return;
                }
                
                await register(name, email, password);
            } else {
                // Login mode
                const email = document.getElementById('email').value.trim();
                const password = document.getElementById('password').value;
                
                if (!email || !password) {
                    showError('Please enter both email and password');
                    return;
                }
                
                await login(email, password);
            }
        });
    }

    // Sign up button
    const showRegisterBtn = document.getElementById('showRegisterBtn');
    if (showRegisterBtn) {
        showRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showRegisterForm();
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
    // Check if we're on localhost (local development)
    const isLocalhost = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '3000';
    
    if (isLocalhost) {
        // For local development, show a helpful message
        showError('Google OAuth is not available for local development. Please use Email/Password login instead. Google OAuth is available in the production deployment.');
    } else {
        // Production - redirect to Google OAuth endpoint
        window.location.href = '/api/auth/google';
    }
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
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: include cookies for session
            body: JSON.stringify({ email, password }),
            signal: controller.signal // Add abort signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request succeeds
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type') || '';
        let data;

        // First, get the response as text to check what we received
        let responseText;
        try {
            responseText = await response.text();
        } catch (readError) {
            console.error('Failed to read response body:', readError);
            throw new Error('Failed to receive server response. Please check your internet connection.');
        }

        // Try to parse as JSON
        if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text:', responseText.substring(0, 500));
                throw new Error('Server returned invalid data. Please try again.');
            }
        } else {
            // Response is HTML (likely Vercel error page)
            console.error('Received HTML error page:', {
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                preview: responseText.substring(0, 500)
            });
            
            // Check if it's a Vercel error page
            if (responseText.includes('Error:') || responseText.includes('Internal Server Error')) {
                throw new Error('Server encountered an error. Please try again in a moment.');
            } else {
                throw new Error('Unexpected server response. Please try again.');
            }
        }
        
        if (response.ok && data.success) {
            // Check if we're on localhost (local development)
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.port === '3000';
            
            // Store token if provided (production/Vercel)
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            } else if (!isLocalhost) {
                // Production but no token - clear any old token
                localStorage.removeItem('authToken');
            }
            
            // For local development, session is automatically handled via cookies
            // For production, token is stored in localStorage
            
            // Redirect to home
            window.location.href = '/index.html';
        } else {
            // Extract error message from response
            const errorMsg = data.error || 'Login failed';
            
            // Handle specific status codes
            if (response.status === 503) {
                throw new Error('Service temporarily unavailable. Please try again in a moment.');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorMsg);
            }
        }
    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout
        
        console.error('Login error:', error);
        
        // Show user-friendly error message based on error type
        let errorMessage = 'Failed to login. Please check your credentials.';
        
        // Timeout/Abort errors
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
        }
        // Network errors
        else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        // Server response format errors
        else if (error.message.includes('Server error') || error.message.includes('Invalid response')) {
            errorMessage = 'Server error. Please try again in a moment.';
        }
        // Specific API error messages (passed through from API)
        else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
        loginBtn.disabled = false;
        loading.style.display = 'none';
        loginBtnText.textContent = 'Sign In';
    }
}

/**
 * Form toggle is no longer needed - both sections are always visible
 * This function is kept for compatibility but does nothing
 */
function setupFormToggle() {
    // No longer needed - both sections always visible
    // Can be removed entirely or left as empty function for compatibility
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
 * Shows registration form
 */
function showRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const emailForm = document.getElementById('emailLoginForm');
    
    if (!loginForm || !emailForm) return;
    
    // Change form title and button
    const submitBtn = document.getElementById('loginBtn');
    const submitBtnText = document.getElementById('loginBtnText');
    const registerLink = document.querySelector('.register-link');
    
    // Update form to registration mode
    loginForm.setAttribute('data-mode', 'register');
    submitBtnText.textContent = 'Sign Up';
    
    // Add name field if not exists
    let nameField = document.getElementById('registerName');
    if (!nameField) {
        const emailGroup = document.querySelector('.form-group:has(#email)');
        const nameGroup = document.createElement('div');
        nameGroup.className = 'form-group';
        nameGroup.innerHTML = `
            <label for="registerName">Name</label>
            <input type="text" id="registerName" name="name" required autocomplete="name" placeholder="Enter your full name">
        `;
        loginForm.insertBefore(nameGroup, emailGroup);
    }
    
    // Update link text
    if (registerLink) {
        registerLink.innerHTML = 'Already have an account? <a href="#" id="showLoginBtn">Sign in</a>';
        
        // Remove old listener and add new one
        setTimeout(() => {
            const loginBtn = document.getElementById('showLoginBtn');
            if (loginBtn) {
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    hideRegisterForm();
                });
            }
        }, 0);
    }
}

/**
 * Hides registration form and shows login form
 */
function hideRegisterForm() {
    const loginForm = document.getElementById('loginForm');
    const submitBtnText = document.getElementById('loginBtnText');
    const registerLink = document.querySelector('.register-link');
    const nameField = document.getElementById('registerName');
    
    if (!loginForm) return;
    
    // Update form to login mode
    loginForm.setAttribute('data-mode', 'login');
    submitBtnText.textContent = 'Sign In';
    
    // Remove name field
    if (nameField) {
        nameField.parentElement.remove();
    }
    
    // Update link text
    if (registerLink) {
        registerLink.innerHTML = 'Don\'t have an account? <a href="#" id="showRegisterBtn">Sign up</a>';
        
        // Add listener back
        setTimeout(() => {
            const registerBtn = document.getElementById('showRegisterBtn');
            if (registerBtn) {
                registerBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    showRegisterForm();
                });
            }
        }, 0);
    }
}

/**
 * Handles user registration
 */
async function register(name, email, password) {
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');
    const loginBtnText = document.getElementById('loginBtnText');
    
    loginBtn.disabled = true;
    loading.style.display = 'inline-block';
    loginBtnText.textContent = 'Signing up...';
    clearErrors();
    
    // Create abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    try {
        const response = await fetch('/api/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // Important: include cookies for session
            body: JSON.stringify({ name, email, password }),
            signal: controller.signal // Add abort signal
        });
        
        clearTimeout(timeoutId); // Clear timeout if request succeeds
        
        // Check if response is JSON before parsing
        const contentType = response.headers.get('content-type') || '';
        let data;

        // First, get the response as text to check what we received
        let responseText;
        try {
            responseText = await response.text();
        } catch (readError) {
            console.error('Failed to read response body:', readError);
            throw new Error('Failed to receive server response. Please check your internet connection.');
        }

        // Try to parse as JSON
        if (contentType.includes('application/json') || responseText.trim().startsWith('{') || responseText.trim().startsWith('[')) {
            try {
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                console.error('Response text:', responseText.substring(0, 500));
                throw new Error('Server returned invalid data. Please try again.');
            }
        } else {
            // Response is HTML (likely Vercel error page)
            console.error('Received HTML error page:', {
                status: response.status,
                statusText: response.statusText,
                contentType: contentType,
                preview: responseText.substring(0, 500)
            });
            
            // Check if it's a Vercel error page
            if (responseText.includes('Error:') || responseText.includes('Internal Server Error')) {
                throw new Error('Server encountered an error. Please try again in a moment.');
            } else {
                throw new Error('Unexpected server response. Please try again.');
            }
        }
        
        if (response.ok && data.success) {
            // Check if we're on localhost (local development)
            const isLocalhost = window.location.hostname === 'localhost' || 
                               window.location.hostname === '127.0.0.1' ||
                               window.location.port === '3000';
            
            // Store token if provided (production/Vercel)
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            } else if (!isLocalhost) {
                // Production but no token - clear any old token
                localStorage.removeItem('authToken');
            }
            
            // For local development, session is automatically handled via cookies
            // For production, token is stored in localStorage
            
            // Redirect to home
            window.location.href = '/index.html';
        } else {
            // Extract error message from response
            const errorMsg = data.error || 'Registration failed';
            
            // Handle specific status codes
            if (response.status === 503) {
                throw new Error('Service temporarily unavailable. Please try again in a moment.');
            } else if (response.status >= 500) {
                throw new Error('Server error. Please try again later.');
            } else {
                throw new Error(errorMsg);
            }
        }
    } catch (error) {
        clearTimeout(timeoutId); // Clear timeout
        
        console.error('Registration error:', error);
        
        // Show user-friendly error message based on error type
        let errorMessage = 'Failed to register. Please try again.';
        
        // Timeout/Abort errors
        if (error.name === 'AbortError') {
            errorMessage = 'Request timed out. Please check your internet connection and try again.';
        }
        // Network errors
        else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
            errorMessage = 'Network error. Please check your internet connection and try again.';
        }
        // Server response format errors
        else if (error.message.includes('Server error') || error.message.includes('Invalid response')) {
            errorMessage = 'Server error. Please try again in a moment.';
        }
        // Specific API error messages (passed through from API)
        else if (error.message) {
            errorMessage = error.message;
        }
        
        showError(errorMessage);
        loginBtn.disabled = false;
        loading.style.display = 'none';
        loginBtnText.textContent = 'Sign Up';
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

