/**
 * ArticleModel - Data Layer
 * Handles all data operations and API calls
 */
const ArticleModel = {
    articles: [],
    cursor: 0,
    articlesPerPage: 6,
    desktopArticlesLimit: 9,
    
    /**
     * Fetches articles from the backend API
     * @returns {Promise<Array>} Array of articles or null on error
     */
    async fetchArticles() {
        try {
            const response = await fetch('/api/articles');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.articles) {
                this.articles = data.articles;
                return this.articles;
            }
            return [];
        } catch (error) {
            console.error("Error fetching articles:", error);
            return null;
        }
    },

    /**
     * Gets the next batch of articles for infinite scroll
     * @returns {Array} Batch of articles
     */
    getNextBatch() {
        const batch = [];
        for (let i = 0; i < this.articlesPerPage; i++) {
            if (this.cursor >= this.articles.length) {
                break;
            }
            batch.push(this.articles[this.cursor]);
            this.cursor++;
        }
        return batch;
    },

    /**
     * Gets a fixed number of articles for desktop view
     * @returns {Array} Desktop articles (excluding featured)
     */
    getDesktopArticles() {
        const endIndex = Math.min(this.articles.length, this.desktopArticlesLimit + 1);
        return this.articles.slice(1, endIndex);
    },

    /**
     * Fetches user profile data
     * @returns {Promise<Object|null>} User profile or null
     */
    async fetchProfile() {
        try {
            const response = await fetch('/api/profile');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success && data.user) {
                return data.user;
            }
            return null;
        } catch (error) {
            console.error("Error fetching profile:", error);
            return null;
        }
    },

    /**
     * Updates user profile data
     * @param {string} name - User's name
     * @param {string} email - User's email
     * @returns {Promise<Object>} Updated user data
     */
    async updateProfile(name, email) {
        try {
            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ name, email })
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.user;
        } catch (error) {
            console.error("Error updating profile:", error);
            throw error;
        }
    },

    /**
     * Logs out the user
     * @returns {Promise<boolean>} Success status
     */
    async logout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return true;
        } catch (error) {
            console.error("Error logging out:", error);
            return false;
        }
    },

    /**
     * Submits a new article
     * @param {FormData} formData - Article form data
     * @returns {Promise<Object>} Submitted article
     */
    async submitArticle(formData) {
        try {
            const response = await fetch('/api/articles', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            return data.article;
        } catch (error) {
            console.error("Error submitting article:", error);
            throw error;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArticleModel;
}

