/**
 * AppController - Application Controller
 * The brain of the application - connects Model and Views
 * Handles user input and application logic
 */
const AppController = {
    isLoading: false,
    scrollObserver: null,
    lastIsMobileView: null,
    resizeTimeout: null,

    /**
     * Initializes the application
     */
    async init() {
        console.log("AppController.init() called.");
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.onDOMReady());
        } else {
            this.onDOMReady();
        }
    },

    /**
     * Called when DOM is ready
     */
    async onDOMReady() {
        console.log("DOMContentLoaded fired.");
        
        // Initialize views
        ArticleView.init();
        FormView.init();
        
        // Perform initial authentication check
        await this.checkAuthStatus();

        const articles = await ArticleModel.fetchArticles();
        if (articles === null) {
            ArticleView.renderErrorState();
        } else {
            this.lastIsMobileView = this.isMobileView();
            this.renderContentBasedOnView(articles);
            this.setupEventListeners();
            window.addEventListener('resize', this.handleResize.bind(this));
        }
    },

    /**
     * Performs authentication check and updates UI or redirects
     */
    async checkAuthStatus() {
        console.log("AppController.checkAuthStatus() called.");
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.authenticated) {
                ProfileView.updateProfileButton(data.user);
            } else {
                console.log("Not authenticated, redirecting to /login");
                window.location.href = '/login';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = '/login';
        }
    },

    /**
     * Determines whether the current view is mobile
     * @returns {boolean} True if mobile view
     */
    isMobileView() {
        const isMobile = window.innerWidth <= 768;
        console.log(`isMobileView: ${isMobile}, window.innerWidth: ${window.innerWidth}`);
        return isMobile;
    },

    /**
     * Renders content based on view type (mobile/desktop)
     * @param {Array} articles - Array of articles
     */
    renderContentBasedOnView(articles) {
        const isMobile = this.isMobileView();
        console.log(`renderContentBasedOnView: isMobile = ${isMobile}`);
        
        // Reset cursor and loop state for fresh rendering (start from 0 now, no featured article)
        ArticleModel.cursor = 0;
        ArticleModel.resetLoop();
        
        ArticleView.renderInitialLayout(articles, isMobile);
        this.toggleInfiniteScroll(isMobile);
    },

    /**
     * Toggles infinite scroll on/off based on view
     * @param {boolean} enable - Whether to enable infinite scroll
     */
    toggleInfiniteScroll(enable) {
        console.log(`toggleInfiniteScroll: enable = ${enable}`);
        if (this.scrollObserver) {
            console.log("toggleInfiniteScroll: disconnecting existing observer.");
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }

        if (enable && ArticleView.elements.scrollSentinel) {
            console.log("toggleInfiniteScroll: enabling observer for mobile.");
            this.scrollObserver = new IntersectionObserver(
                this.handleInfiniteScroll.bind(this), 
                { 
                    threshold: 0.1,
                    rootMargin: '400px' // Load much earlier for seamless experience
                }
            );
            this.scrollObserver.observe(ArticleView.elements.scrollSentinel);
        } else if (!enable) {
            console.log("toggleInfiniteScroll: infinite scroll disabled for desktop.");
            ArticleView.toggleLoadingIndicator(false);
        }
    },

    /**
     * Handles window resize to adjust content rendering
     */
    handleResize() {
        clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
            const currentIsMobile = this.isMobileView();
            if (currentIsMobile !== this.lastIsMobileView) {
                console.log(`Resize: View mode changed from ${this.lastIsMobileView} to ${currentIsMobile}. Re-rendering.`);
                this.lastIsMobileView = currentIsMobile;
                this.renderContentBasedOnView(ArticleModel.articles);
            }
        }, 200);
    },

    /**
     * Sets up all event listeners for the application
     */
    setupEventListeners() {
        console.log("AppController.setupEventListeners() called.");
        
        // Profile functionality
        const profileBtn = document.querySelector('.bottom-nav .nav-item:last-child');
        if (profileBtn) {
            profileBtn.addEventListener('click', this.handleProfileClick.bind(this));
        }

        // Article submission functionality
        if (FormView.elements.addArticleBtn) {
            FormView.elements.addArticleBtn.addEventListener('click', this.handleOpenArticleForm.bind(this));
        }
        if (FormView.elements.closeArticleForm) {
            FormView.elements.closeArticleForm.addEventListener('click', this.handleCloseArticleForm.bind(this));
        }
        if (FormView.elements.cancelArticle) {
            FormView.elements.cancelArticle.addEventListener('click', this.handleCloseArticleForm.bind(this));
        }
        if (FormView.elements.articleForm) {
            FormView.elements.articleForm.addEventListener('submit', this.handleArticleSubmission.bind(this));
        }

        // File upload interactions
        this.setupFileUploadListeners();
        
        // Character count updates
        if (FormView.elements.titleInput) {
            FormView.elements.titleInput.addEventListener('input', () => 
                FormView.updateCharCount(FormView.elements.titleInput, FormView.elements.titleCount, 100)
            );
        }
        if (FormView.elements.bodyInput) {
            FormView.elements.bodyInput.addEventListener('input', () => 
                FormView.updateCharCount(FormView.elements.bodyInput, FormView.elements.bodyCount, 450)
            );
        }

        // Close modals on backdrop click
        if (FormView.elements.articleFormModal) {
            FormView.elements.articleFormModal.addEventListener('click', (e) => {
                if (e.target === FormView.elements.articleFormModal) {
                    this.handleCloseArticleForm();
                }
            });
        }
    },

    /**
     * Sets up file upload event listeners
     */
    setupFileUploadListeners() {
        const { fileUploadArea, articleImage, removeImage } = FormView.elements;
        
        // File upload area click
        if (fileUploadArea) {
            fileUploadArea.addEventListener('click', () => articleImage.click());
            fileUploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = '#5a6fd8';
                fileUploadArea.style.background = '#f0f2ff';
            });
            fileUploadArea.addEventListener('dragleave', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = '#667eea';
                fileUploadArea.style.background = '#f8f9ff';
            });
            fileUploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                fileUploadArea.style.borderColor = '#667eea';
                fileUploadArea.style.background = '#f8f9ff';
                const files = e.dataTransfer.files;
                if (files.length > 0) {
                    FormView.handleImageSelection(files[0]);
                }
            });
        }
        
        // File input change
        if (articleImage) {
            articleImage.addEventListener('change', (e) => {
                if (e.target.files.length > 0) {
                    FormView.handleImageSelection(e.target.files[0]);
                }
            });
        }
        
        // Remove image button
        if (removeImage) {
            removeImage.addEventListener('click', () => {
                FormView.removeSelectedImage();
            });
        }
    },

    /**
     * Handles infinite scroll logic
     * @param {Array} entries - IntersectionObserver entries
     */
    handleInfiniteScroll(entries) {
        console.log("handleInfiniteScroll: IntersectionObserver fired.", 
                    "isIntersecting:", entries[0].isIntersecting, 
                    "cursor:", ArticleModel.cursor,
                    "total articles:", ArticleModel.articles.length);
        
        // Check if we've reached the end - shuffle and continue
        if (ArticleModel.cursor >= ArticleModel.articles.length && 
            entries[0].isIntersecting && 
            !this.isLoading) {
            
            console.log("Reached end of articles - shuffling for infinite scroll");
            this.isLoading = true;
            ArticleView.toggleLoadingIndicator(true);
            
            // Shuffle articles and continue loading
            setTimeout(() => {
                ArticleModel.shuffleArticles();
                const nextBatch = ArticleModel.getNextBatch();
                
                if (nextBatch.length > 0) {
                    ArticleView.renderArticleGrid(nextBatch);
                    console.log("Loaded", nextBatch.length, "shuffled articles");
                }
                
                ArticleView.toggleLoadingIndicator(false);
                this.isLoading = false;
            }, 400);
            
            return;
        }
        
        // Check if we should load more articles
        const shouldLoadMore = entries[0].isIntersecting && 
                               !this.isLoading && 
                               ArticleModel.cursor < ArticleModel.articles.length;
        
        if (shouldLoadMore) {
            this.isLoading = true;
            ArticleView.toggleLoadingIndicator(true);
            
            // Simulate network delay for smooth UX
            setTimeout(() => {
                const nextBatch = ArticleModel.getNextBatch();
                
                if (nextBatch.length > 0) {
                    ArticleView.renderArticleGrid(nextBatch);
                    console.log("Loaded", nextBatch.length, "more articles");
                }
                
                ArticleView.toggleLoadingIndicator(false);
                this.isLoading = false;
            }, 400);
        }
    },

    /**
     * Handles profile button click
     * @param {Event} e - Click event
     */
    async handleProfileClick(e) {
        e.preventDefault();
        ProfileView.renderProfileModal({ 
            name: 'Loading...', 
            email: 'Loading...', 
            createdAt: new Date().toISOString() 
        });
        try {
            const user = await ArticleModel.fetchProfile();
            if (user) {
                ProfileView.renderProfileModal(user);
                this.setupProfileModalListeners();
            } else {
                ProfileView.closeProfileModal();
                window.location.href = '/login';
            }
        } catch (error) {
            ProfileView.showProfileError('Failed to load profile.');
            ProfileView.closeProfileModal();
            console.error('Profile load error:', error);
        }
    },

    /**
     * Sets up event listeners for the profile modal
     */
    setupProfileModalListeners() {
        const modal = ProfileView.profileModal;
        if (!modal) return;

        modal.querySelector('.close-modal').addEventListener('click', () => ProfileView.closeProfileModal());
        modal.querySelector('#editProfileBtn').addEventListener('click', () => this.handleEditProfile());
        modal.querySelector('#logoutBtn').addEventListener('click', () => this.handleLogout());
        modal.querySelector('#saveProfileBtn').addEventListener('click', () => this.handleSaveProfile());
        modal.querySelector('#cancelEditBtn').addEventListener('click', () => this.handleCancelEditProfile());
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                ProfileView.closeProfileModal();
            }
        });
    },

    /**
     * Handles edit profile button click
     */
    handleEditProfile() {
        ProfileView.toggleProfileEditMode(true);
    },

    /**
     * Handles cancel edit profile button click
     */
    handleCancelEditProfile() {
        ProfileView.toggleProfileEditMode(false);
    },

    /**
     * Handles saving profile changes
     */
    async handleSaveProfile() {
        const nameInput = ProfileView.profileModal.querySelector('#editName');
        const emailInput = ProfileView.profileModal.querySelector('#editEmail');
        const name = nameInput.value;
        const email = emailInput.value;

        if (!name || !email) {
            ProfileView.showProfileError('Name and email are required.');
            return;
        }

        try {
            const updatedUser = await ArticleModel.updateProfile(name, email);
            ProfileView.renderProfileModal(updatedUser);
            ProfileView.updateProfileButton(updatedUser);
            ProfileView.showProfileSuccess('Profile updated successfully!');
            this.setupProfileModalListeners();
        } catch (error) {
            ProfileView.showProfileError(error.message || 'Failed to update profile.');
            console.error('Profile update error:', error);
        }
    },

    /**
     * Handles user logout
     */
    async handleLogout() {
        if (await ArticleModel.logout()) {
            window.location.href = '/login';
        } else {
            ProfileView.showProfileError('Failed to log out.');
        }
    },

    /**
     * Handles opening the article submission form
     * @param {Event} e - Click event
     */
    handleOpenArticleForm(e) {
        e.preventDefault();
        FormView.openArticleFormModal();
    },

    /**
     * Handles closing the article submission form
     */
    handleCloseArticleForm() {
        FormView.closeArticleFormModal();
    },

    /**
     * Handles article submission
     * @param {Event} e - Submit event
     */
    async handleArticleSubmission(e) {
        e.preventDefault();
        
        const form = FormView.elements.articleForm;
        const title = form.querySelector('#articleTitle').value;
        const body = form.querySelector('#articleBody').value;
        const tag = form.querySelector('#articleTag').value;
        
        // Validation
        if (!title || !body || !tag) {
            alert('Please fill in all required fields');
            return;
        }

        if (!FormView.getCurrentImageFile()) {
            alert('Please select an image');
            return;
        }

        if (title.length > 100) {
            alert('Title must be 100 characters or less');
            return;
        }

        if (body.length > 450) {
            alert('Article body must be 450 characters or less');
            return;
        }

        FormView.setSubmitting(true);

        try {
            // Get adjusted image blob
            const adjustedBlob = await FormView.getAdjustedImageBlob();
            
            if (!adjustedBlob) {
                alert('Please select an image');
                FormView.setSubmitting(false);
                return;
            }
            
            // Create new FormData with adjusted image
            const formData = new FormData();
            formData.append('title', title);
            formData.append('body', body);
            formData.append('tag', tag);
            formData.append('image', adjustedBlob, 'article-image.jpg');
            
            await ArticleModel.submitArticle(formData);
            alert('Article submitted successfully! Your article is now live.');
            FormView.closeArticleFormModal();
            
            // Reload articles to include the new one
            const articles = await ArticleModel.fetchArticles();
            if (articles !== null) {
                // Reset cursor and re-render
                this.renderContentBasedOnView(articles);
            }
        } catch (error) {
            alert(error.message || 'Failed to submit article. Please try again.');
            console.error('Article submission error:', error);
            FormView.setSubmitting(false);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppController;
}

