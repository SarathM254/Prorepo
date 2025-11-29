/**
 * Utility Helper Functions
 */
const Helpers = {
    /**
     * Calculates time since an article was posted
     * @param {string} dateString - ISO date string
     * @returns {string} Human-readable time ago string
     */
    getTimeAgo(dateString) {
        const now = new Date();
        const articleDate = new Date(dateString);
        const diffInSeconds = Math.floor((now - articleDate) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    },

    /**
     * Escapes HTML to prevent XSS attacks
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    /**
     * Gets authentication headers for API requests
     * Supports both session-based (local) and token-based (production) auth
     * @param {Object} options - Additional fetch options
     * @returns {Object} Fetch options with auth headers
     */
    getAuthHeaders(options = {}) {
        const headers = options.headers || {};
        const authToken = localStorage.getItem('authToken');
        
        // Always include credentials for session-based auth (local development)
        const fetchOptions = {
            ...options,
            credentials: 'include',
            headers: {
                ...headers,
                'Content-Type': headers['Content-Type'] || 'application/json'
            }
        };
        
        // Add Bearer token if available (for production/Vercel)
        if (authToken) {
            fetchOptions.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        return fetchOptions;
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = Helpers;
}

