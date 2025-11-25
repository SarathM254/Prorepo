/**
 * ArticleModel - Data Layer
 * Handles all data operations and API calls
 */
const ArticleModel = {
    articles: [],
    originalArticles: [], // Store original articles for filtering
    cursor: 0,
    articlesPerPage: 5, // Reduced for smoother scrolling experience
    desktopArticlesLimit: 9,
    hasLoopedOnce: false, // Track if we've looped through articles
    currentFilter: 'all', // Track current filter category
    
    /**
     * Fetches articles from the backend API
     * @returns {Promise<Array>} Array of articles or null on error
     */
    async fetchArticles() {
        try {
            console.log('🔍 [ArticleModel] Fetching articles from /api/articles...');
            const response = await fetch('/api/articles');
            console.log('📡 [ArticleModel] Response status:', response.status, response.statusText);
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 [ArticleModel] Raw API response:', data);
            console.log('📊 [ArticleModel] Articles count:', data.articles?.length || 0);
            
            if (data.success && data.articles) {
                this.articles = data.articles;
                this.originalArticles = [...data.articles]; // Store original for filtering
                console.log('✅ [ArticleModel] Articles stored:', this.articles.length);
                console.log('🖼️ [ArticleModel] First article sample:', this.articles[0]);
                return this.articles;
            }
            console.warn('⚠️ [ArticleModel] No articles in response');
            return [];
        } catch (error) {
            console.error("❌ [ArticleModel] Error fetching articles:", error);
            console.error("❌ [ArticleModel] Error details:", error.message, error.stack);
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
     * Shuffles the articles array
     * Used for infinite scroll to show articles in random order
     */
    shuffleArticles() {
        if (this.articles.length === 0) return;
        
        // Shuffle all articles using Fisher-Yates algorithm
        for (let i = this.articles.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.articles[i], this.articles[j]] = [this.articles[j], this.articles[i]];
        }
        
        // Reset cursor to start loading from position 0
        this.cursor = 0;
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
     * Filters articles by category
     * @param {string} category - Category to filter by ('all' for all articles)
     * @returns {Array} Filtered articles
     */
    filterArticles(category) {
        this.currentFilter = category || 'all';
        
        if (category === 'all' || !category) {
            this.articles = [...this.originalArticles];
        } else {
            this.articles = this.originalArticles.filter(article => article.tag === category);
        }
        
        // Reset cursor when filtering
        this.cursor = 0;
        this.hasLoopedOnce = false;
        
        console.log(`🔍 [ArticleModel] Filtered by "${category}": ${this.articles.length} articles`);
        return this.articles;
    },

    /**
     * Gets a fixed number of articles for desktop view
     * @returns {Array} Desktop articles
     */
    getDesktopArticles() {
        const endIndex = Math.min(this.articles.length, this.desktopArticlesLimit);
        return this.articles.slice(0, endIndex);
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
     * @param {Object} articleData - Article data (title, body, tag, imageData)
     * @returns {Promise<Object>} Submitted article
     */
    async submitArticle(articleData) {
        try {
            console.log('📤 [ArticleModel] Submitting article to /api/articles...');
            console.log('📝 [ArticleModel] Article data:', {
                title: articleData.title,
                tag: articleData.tag,
                bodyLength: articleData.body?.length,
                hasImage: !!articleData.imageData
            });
            
            const response = await fetch('/api/articles', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(articleData)
            });
            
            console.log('📡 [ArticleModel] Submit response status:', response.status, response.statusText);
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error('❌ [ArticleModel] Submit failed:', errorData);
                throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('✅ [ArticleModel] Article submitted successfully:', data);
            return data.article;
        } catch (error) {
            console.error("❌ [ArticleModel] Error submitting article:", error);
            console.error("❌ [ArticleModel] Error details:", error.message);
            throw error;
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArticleModel;
}

