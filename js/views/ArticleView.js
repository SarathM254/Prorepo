/**
 * ArticleView - Article Rendering
 * Handles rendering of articles and layout
 */
const ArticleView = {
    /**
     * Cache DOM elements for performance
     */
    elements: {
        loadingContainer: null,
        featuredStory: null,
        newsGrid: null,
        footer: null,
        scrollSentinel: null
    },

    /**
     * Initialize DOM element references
     */
    init() {
        this.elements.loadingContainer = document.getElementById('loadingContainer');
        this.elements.featuredStory = document.getElementById('featuredStory');
        this.elements.newsGrid = document.getElementById('newsGrid');
        this.elements.footer = document.querySelector('.footer');
        this.createScrollSentinel();
    },

    /**
     * Creates a scroll sentinel element for infinite scroll detection
     */
    createScrollSentinel() {
        // Remove existing sentinel if any
        if (this.elements.scrollSentinel) {
            this.elements.scrollSentinel.remove();
        }
        
        // Create new sentinel element
        const sentinel = document.createElement('div');
        sentinel.id = 'scroll-sentinel';
        sentinel.style.height = '20px';
        sentinel.style.visibility = 'hidden';
        
        // Insert after news grid
        if (this.elements.newsGrid && this.elements.newsGrid.parentNode) {
            this.elements.newsGrid.parentNode.insertBefore(
                sentinel, 
                this.elements.newsGrid.nextSibling
            );
        }
        
        this.elements.scrollSentinel = sentinel;
    },

    /**
     * Renders the initial layout with articles
     * @param {Array} articles - Array of article objects
     * @param {boolean} isMobileView - Whether it's mobile view
     */
    renderInitialLayout(articles, isMobileView) {
        console.log('🎨 [ArticleView] renderInitialLayout called');
        console.log('📊 [ArticleView] Articles received:', articles?.length || 0);
        console.log('📱 [ArticleView] Is mobile view:', isMobileView);
        
        this.elements.loadingContainer.style.display = 'none';
        
        // Clean up any existing loading indicators
        const existingIndicator = document.querySelector('.loading-indicator');
        if (existingIndicator) existingIndicator.remove();
        
        if (!articles || articles.length === 0) {
            console.warn('⚠️ [ArticleView] No articles to render, showing empty state');
            this.renderEmptyState();
            return;
        }

        // Hide featured story section
        this.elements.featuredStory.style.display = 'none';

        if (isMobileView) {
            const initialBatch = ArticleModel.getNextBatch();
            console.log('📱 [ArticleView] Mobile: Rendering initial batch of', initialBatch.length, 'articles');
            this.elements.newsGrid.innerHTML = '';
            this.renderArticleGrid(initialBatch);
            this.elements.newsGrid.style.display = 'grid';
            // Show sentinel for infinite scroll
            if (this.elements.scrollSentinel) {
                this.elements.scrollSentinel.style.display = 'block';
            }
        } else {
            // Desktop: Show ONLY fixed number of articles (NO INFINITE SCROLL, NO REPEATS)
            const maxArticles = Math.min(ArticleModel.desktopArticlesLimit, ArticleModel.articles.length);
            const desktopArticles = ArticleModel.articles.slice(0, maxArticles);
            console.log(`💻 [ArticleView] Desktop: Rendering EXACTLY ${desktopArticles.length} articles (max ${ArticleModel.desktopArticlesLimit})`);
            
            // FORCE CLEAR - ensure no duplicates
            this.elements.newsGrid.innerHTML = '';
            
            // Render each article
            const fragment = document.createDocumentFragment();
            desktopArticles.forEach((article, index) => {
                const articleEl = document.createElement('div');
                articleEl.className = 'news-card';
                articleEl.innerHTML = this.createArticleHTML(article, false);
                fragment.appendChild(articleEl);
                console.log(`  └─ Article ${index + 1}: ${article.title?.substring(0, 30)}...`);
            });
            this.elements.newsGrid.appendChild(fragment);
            this.elements.newsGrid.style.display = 'grid';
            
            // FORCE HIDE sentinel on desktop - absolutely no infinite scroll
            if (this.elements.scrollSentinel) {
                this.elements.scrollSentinel.style.display = 'none';
                this.elements.scrollSentinel.style.visibility = 'hidden';
            }
            
            console.log('✅ [ArticleView] Desktop render complete - NO MORE ARTICLES WILL BE ADDED');
        }
        console.log('✅ [ArticleView] Initial layout rendered');
    },

    /**
     * Appends a new batch of articles to the grid
     * @param {Array} articles - Batch of articles
     */
    renderArticleGrid(articles) {
        const fragment = document.createDocumentFragment();
        articles.forEach(article => {
            const articleEl = document.createElement('div');
            articleEl.className = 'news-card';
            articleEl.innerHTML = this.createArticleHTML(article, false);
            fragment.appendChild(articleEl);
        });
        this.elements.newsGrid.appendChild(fragment);
    },

    /**
     * Generates HTML for a single article card
     * @param {Object} article - Article object
     * @param {boolean} isFeatured - Whether this is a featured article
     * @returns {string} HTML string
     */
    createArticleHTML(article, isFeatured) {
        console.log('🔨 [ArticleView] Creating HTML for article:', article.id, article.title);
        console.log('🖼️ [ArticleView] Image path:', article.image_path);
        console.log('✍️ [ArticleView] Author:', article.author_name);
        
        const timeAgo = Helpers.getTimeAgo(article.created_at);
        const titleTag = isFeatured ? 'h2' : 'h3';
        
        return `
            <div class="card-image">
                <img src="${article.image_path}" alt="${article.title}" loading="lazy" onerror="console.error('❌ Image failed to load:', '${article.image_path}')">
                <div class="card-category">${article.tag}</div>
            </div>
            <div class="card-content">
                <div class="card-source">
                    <div class="source-icon"></div>
                    <span>Proto</span>
                    <div class="card-actions">
                        <button class="bookmark-btn" aria-label="Bookmark"><i class="fas fa-bookmark"></i></button>
                        <button class="share-btn" aria-label="Share"><i class="fas fa-share"></i></button>
                    </div>
                </div>
                <${titleTag} class="card-title">${article.title}</${titleTag}>
                <p class="card-description">${article.body}</p>
                <div class="card-meta">
                    <span class="time">${timeAgo}</span>
                    <span class="author">${article.author_name}</span>
                </div>
            </div>
        `;
    },

    /**
     * Renders empty state when no articles are available
     */
    renderEmptyState() {
        this.elements.loadingContainer.innerHTML = `
            <div class="no-articles">
                <h3>No articles found</h3>
                <p>Be the first to submit an article!</p>
            </div>`;
        this.elements.loadingContainer.style.display = 'flex';
    },

    /**
     * Renders error state if API call fails
     */
    renderErrorState() {
        this.elements.loadingContainer.innerHTML = `
            <div class="error-state">
                <h3>Error loading articles</h3>
                <p>Please try refreshing the page.</p>
                <button onclick="location.reload()">Refresh</button>
            </div>`;
        this.elements.loadingContainer.style.display = 'flex';
    },

    /**
     * Shows or hides the infinite scroll loading indicator
     * @param {boolean} show - Whether to show the indicator
     */
    toggleLoadingIndicator(show) {
        // Find existing indicator
        let indicator = document.querySelector('.loading-indicator');
        
        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.className = 'loading-indicator';
                indicator.innerHTML = `<div class="spinner"></div><p>Loading more articles...</p>`;
                
                // Insert before scroll sentinel (works on mobile and desktop)
                if (this.elements.scrollSentinel) {
                    this.elements.scrollSentinel.insertAdjacentElement('beforebegin', indicator);
                }
            }
            if (indicator) {
                indicator.style.display = 'flex';
            }
        } else {
            if (indicator) {
                indicator.style.display = 'none';
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ArticleView;
}

