/**
 * Main Application Entry Point
 * Initializes the application when all scripts are loaded
 */

// Handle Google OAuth callback token from URL
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (token) {
        // Store token and clean URL
        localStorage.setItem('authToken', token);
        window.history.replaceState({}, document.title, window.location.pathname);
    }
});

// Start the application
AppController.init();

