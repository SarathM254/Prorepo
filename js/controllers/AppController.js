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
        console.log("=== 🚀 [AppController] DOMContentLoaded fired ===");
        
        // Initialize views
        console.log("🔧 [AppController] Initializing views...");
        ArticleView.init();
        FormView.init();
        console.log("✅ [AppController] Views initialized");
        
        // Perform initial authentication check
        console.log("🔐 [AppController] Checking auth status...");
        await this.checkAuthStatus();
        console.log("✅ [AppController] Auth check complete");

        console.log("📰 [AppController] Fetching articles...");
        const articles = await ArticleModel.fetchArticles();
        
        if (articles === null) {
            console.error("❌ [AppController] Failed to fetch articles, showing error state");
            ArticleView.renderErrorState();
        } else {
            console.log("✅ [AppController] Articles fetched successfully:", articles.length);
            this.lastIsMobileView = this.isMobileView();
            this.renderContentBasedOnView(articles);
            this.setupEventListeners();
            window.addEventListener('resize', this.handleResize.bind(this));
            console.log("=== ✅ [AppController] Initialization complete ===");
        }
    },

    /**
     * Performs authentication check and updates UI or redirects
     */
    async checkAuthStatus() {
        console.log("AppController.checkAuthStatus() called.");
        
        // Check if user has auth token in localStorage
        const authToken = localStorage.getItem('authToken');
        
        if (!authToken) {
            console.log("No auth token found - redirecting to login");
            window.location.href = '/login.html';
            return;
        }
        
        try {
            const response = await fetch('/api/auth/status', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            
            if (data.authenticated) {
                // Store super admin status
                if (data.user.isSuperAdmin) {
                    localStorage.setItem('isSuperAdmin', 'true');
                } else {
                    localStorage.removeItem('isSuperAdmin');
                }
                ProfileView.updateProfileButton(data.user);
            } else {
                console.log("Not authenticated - redirecting to login");
                localStorage.removeItem('authToken');
                localStorage.removeItem('isSuperAdmin');
                window.location.href = '/login.html';
            }
        } catch (error) {
            console.error('Auth check failed:', error);
            localStorage.removeItem('authToken');
            localStorage.removeItem('isSuperAdmin');
            window.location.href = '/login.html';
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
        console.log(`🎯 [AppController] renderContentBasedOnView: isMobile = ${isMobile}, articles = ${articles.length}`);
        
        // IMPORTANT: Disconnect any existing scroll observers FIRST
        if (this.scrollObserver) {
            console.log('🛑 [AppController] Disconnecting existing scroll observer before re-render');
            this.scrollObserver.disconnect();
            this.scrollObserver = null;
        }
        
        // Reset cursor and loop state for fresh rendering
        ArticleModel.cursor = 0;
        ArticleModel.resetLoop();
        
        // Clear the grid completely before rendering
        console.log('🧹 [AppController] Clearing news grid before render');
        ArticleView.elements.newsGrid.innerHTML = '';
        
        // Render based on view type
        ArticleView.renderInitialLayout(articles, isMobile);
        
        // Set up infinite scroll only for mobile
        this.toggleInfiniteScroll(isMobile);
        
        console.log(`✅ [AppController] Render complete. Desktop should show max ${ArticleModel.desktopArticlesLimit} articles`);
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
        
        // Home button - refresh page to get randomized articles
        const homeBtn = document.getElementById('homeBtn');
        if (homeBtn) {
            homeBtn.addEventListener('click', (e) => {
                e.preventDefault();
                location.reload();
            });
        }
        
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
     * Handles infinite scroll logic (MOBILE ONLY)
     * @param {Array} entries - IntersectionObserver entries
     */
    handleInfiniteScroll(entries) {
        // SAFETY CHECK: Immediately exit if on desktop
        if (!this.isMobileView()) {
            console.log("🛑 handleInfiniteScroll: BLOCKED - Desktop view detected, infinite scroll disabled");
            return;
        }
        
        console.log("📜 handleInfiniteScroll: Mobile scroll triggered", 
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
        
        // Get user data from auth status (which has isSuperAdmin)
        const authToken = localStorage.getItem('authToken');
        let userData = null;
        
        if (authToken) {
            try {
                const response = await fetch('/api/auth/status', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const data = await response.json();
                if (data.authenticated && data.user) {
                    userData = data.user;
                }
            } catch (error) {
                console.error('Auth status check failed:', error);
            }
        }
        
        // If we have user data, use it; otherwise fetch from profile API
        if (!userData) {
            try {
                const profileData = await ArticleModel.fetchProfile();
                if (profileData) {
                    userData = profileData;
                }
            } catch (error) {
                console.error('Profile fetch failed:', error);
            }
        }
        
        if (userData) {
            ProfileView.renderProfileModal(userData);
            this.setupProfileModalListeners();
        } else {
            ProfileView.renderProfileModal({
                name: 'Demo User',
                email: 'demo@proto.com',
                isSuperAdmin: false
            });
            this.setupProfileModalListeners();
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
        
        // Admin panel button (if exists)
        const adminPanelBtn = modal.querySelector('#adminPanelBtn');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => {
                ProfileView.closeProfileModal();
                if (typeof AdminPanelView !== 'undefined') {
                    AdminPanelView.renderAdminPanel();
                } else {
                    // Fallback to redirect if AdminPanelView not loaded
                    window.location.href = '/admin.html';
                }
            });
        }
        
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
            // Clear auth token
            localStorage.removeItem('authToken');
            // Redirect to login page
            window.location.href = '/login.html';
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
        console.log('=== 📝 [AppController] Article submission started ===');
        
        const form = FormView.elements.articleForm;
        const title = form.querySelector('#articleTitle').value;
        const body = form.querySelector('#articleBody').value;
        const tag = form.querySelector('#articleTag').value;
        
        console.log('📋 [AppController] Form data:', { title, body: body.substring(0, 50) + '...', tag });
        
        // Validation
        if (!title || !body || !tag) {
            console.error('❌ [AppController] Missing required fields');
            alert('Please fill in all required fields');
            return;
        }

        if (!FormView.getCurrentImageFile()) {
            console.error('❌ [AppController] No image selected');
            alert('Please select an image');
            return;
        }

        if (title.length > 100) {
            console.error('❌ [AppController] Title too long:', title.length);
            alert('Title must be 100 characters or less');
            return;
        }

        if (body.length > 450) {
            console.error('❌ [AppController] Body too long:', body.length);
            alert('Article body must be 450 characters or less');
            return;
        }

        console.log('✅ [AppController] Validation passed, preparing submission...');
        FormView.setSubmitting(true);

        try {
            // Get adjusted image blob
            console.log('🖼️ [AppController] Getting adjusted image blob...');
            const adjustedBlob = await FormView.getAdjustedImageBlob();
            console.log('🖼️ [AppController] Image blob received:', adjustedBlob?.size, 'bytes');
            
            if (!adjustedBlob) {
                console.error('❌ [AppController] Failed to get image blob');
                alert('Please select an image');
                FormView.setSubmitting(false);
                return;
            }
            
            // Convert blob to base64 for JSON transmission
            console.log('🔄 [AppController] Converting image to base64...');
            const base64Image = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(adjustedBlob);
            });
            console.log('✅ [AppController] Image converted to base64');
            
            // Create JSON payload
            console.log('📦 [AppController] Creating JSON payload...');
            const payload = {
                title,
                body,
                tag,
                imageData: base64Image
            };
            console.log('✅ [AppController] Payload created, submitting...');
            
            await ArticleModel.submitArticle(payload);
            console.log('✅ [AppController] Article submitted successfully!');
            alert('Article submitted successfully! Your article is now live.');
            FormView.closeArticleFormModal();
            
            // Reload articles to include the new one
            console.log('🔄 [AppController] Reloading articles...');
            const articles = await ArticleModel.fetchArticles();
            if (articles !== null) {
                console.log('✅ [AppController] Re-rendering with', articles.length, 'articles');
                // Reset cursor and re-render
                this.renderContentBasedOnView(articles);
            }
            console.log('=== ✅ [AppController] Article submission complete ===');
        } catch (error) {
            console.error('❌ [AppController] Article submission error:', error);
            console.error('❌ [AppController] Error stack:', error.stack);
            alert(error.message || 'Failed to submit article. Please try again.');
            FormView.setSubmitting(false);
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AppController;
}

