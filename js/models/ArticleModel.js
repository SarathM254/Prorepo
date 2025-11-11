/**
 * ArticleModel - Data Layer
 * Handles all data operations and API calls
 */
const ArticleModel = {
    articles: [],
    cursor: 0,
    articlesPerPage: 5, // Reduced for smoother scrolling experience
    desktopArticlesLimit: 9,
    hasLoopedOnce: false, // Track if we've looped through articles
    
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
     * Shuffles the articles array (excluding the first featured article)
     * Used for infinite scroll to show articles in random order
     */
    shuffleArticles() {
        if (this.articles.length <= 1) return;
        
        // Keep the first article (featured) in place, shuffle the rest
        const featuredArticle = this.articles[0];
        const otherArticles = this.articles.slice(1);
        
        // Fisher-Yates shuffle algorithm
        for (let i = otherArticles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [otherArticles[i], otherArticles[j]] = [otherArticles[j], otherArticles[i]];
        }
        
        // Reconstruct array with featured article first
        this.articles = [featuredArticle, ...otherArticles];
        
        // Reset cursor to start loading from position 1 (after featured)
        this.cursor = 1;
        this.hasLoopedOnce = true;
        
        console.log("Articles shuffled for infinite scroll");
    },

    /**
     * Resets the loop state
     */
    resetLoop() {
        this.hasLoopedOnce = false;
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

