/**
 * Login Page JavaScript
 * Handles Google OAuth login only
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
        // Store token and redirect
        localStorage.setItem('authToken', token);
        window.location.href = '/index.html';
    } else if (error) {
        showError(decodeURIComponent(error));
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

