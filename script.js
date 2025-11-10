const Model = {
        articles: [],
        cursor: 0,
        articlesPerPage: 6, // Default for now, will be adjusted for infinite scroll later
        desktopArticlesLimit: 9, // Total number of articles to show on desktop (excluding featured)
        
        // Fetches articles from the backend API
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
                return null; // Indicates an error occurred
            }
        },

        // Gets the next batch of articles for infinite scroll (simplified for now)
        getNextBatch() {
            const batch = [];
            for (let i = 0; i < this.articlesPerPage; i++) {
                if (this.cursor >= this.articles.length) {
                    // For now, just stop if we run out of articles.
                    // We'll implement looping or proper end-of-content handling later.
                    break;
                }
                batch.push(this.articles[this.cursor]);
                this.cursor++;
            }
            return batch;
        },

        // Gets a fixed number of articles for desktop view
        getDesktopArticles() {
            const endIndex = Math.min(this.articles.length, this.desktopArticlesLimit + 1);
            return this.articles.slice(1, endIndex);
        },

        // Fetches user profile data
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

        // Updates user profile data
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

        // Logs out the user
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

        // Submits a new article
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

    /**
     * ------------------------------------------------------------------------
     * VIEW
     * - Manages the DOM (what the user sees).
     * - Renders data from the Model.
     * - Does not handle application logic.
     * ------------------------------------------------------------------------
     */
    const View = {
        // Cache DOM elements for performance
        elements: {
            loadingContainer: document.getElementById('loadingContainer'),
            featuredStory: document.getElementById('featuredStory'),
            newsGrid: document.getElementById('newsGrid'),
            footer: document.querySelector('.footer'),
            profileModal: null, // Will be created dynamically
            articleFormModal: document.getElementById('articleFormModal'),
            addArticleBtn: document.getElementById('addArticleBtn'),
            closeArticleForm: document.getElementById('closeArticleForm'),
            cancelArticle: document.getElementById('cancelArticle'),
            articleForm: document.getElementById('articleForm'),
            fileUploadArea: document.getElementById('fileUploadArea'),
            articleImage: document.getElementById('articleImage'),
            imagePreview: document.getElementById('imagePreview'),
            previewImg: document.getElementById('previewImg'),
            removeImage: document.getElementById('removeImage'),
            titleInput: document.getElementById('articleTitle'),
            bodyInput: document.getElementById('articleBody'),
            titleCount: document.getElementById('titleCount'),
            bodyCount: document.getElementById('bodyCount'),
            submitArticleBtn: document.getElementById('submitArticle')
        },

        // Renders the initial state of the application
        renderInitialLayout(articles, isMobileView) {
            this.elements.loadingContainer.style.display = 'none';
            
            if (!articles || articles.length === 0) {
                this.renderEmptyState();
                return;
            }

            // Always render the first article as featured
            const featuredArticle = articles[0];
            this.elements.featuredStory.innerHTML = this.createArticleHTML(featuredArticle, true);
            this.elements.featuredStory.style.display = 'block';

            if (isMobileView) {
                // For now, just render the initial batch for mobile. Infinite scroll will be re-implemented.
                const initialBatch = Model.getNextBatch(); 
                this.elements.newsGrid.innerHTML = ''; // Clear previous articles for mobile
                this.renderArticleGrid(initialBatch);
                this.elements.newsGrid.style.display = 'grid';
            } else {
                // Desktop view: render a fixed number of articles
                const desktopArticles = Model.getDesktopArticles();
                this.elements.newsGrid.innerHTML = ''; // Clear previous articles
                desktopArticles.forEach(article => {
                    const articleEl = document.createElement('div');
                    articleEl.className = 'news-card';
                    articleEl.innerHTML = this.createArticleHTML(article, false);
                    this.elements.newsGrid.appendChild(articleEl);
                });
                this.elements.newsGrid.style.display = 'grid';
            }
        },

        // Appends a new batch of articles to the grid (used for mobile infinite scroll)
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

        // Generates the HTML for a single article card
        createArticleHTML(article, isFeatured) {
            const timeAgo = this.getTimeAgo(article.created_at);
            const titleTag = isFeatured ? 'h2' : 'h3';
            
            return `
                <div class="card-image">
                    <img src="${article.image_path}" alt="${article.title}" loading="lazy">
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

        // Renders a message when no articles are available
        renderEmptyState() {
            this.elements.loadingContainer.innerHTML = `
                <div class="no-articles">
                    <h3>No articles found</h3>
                    <p>Be the first to submit an article!</p>
                </div>`;
            this.elements.loadingContainer.style.display = 'flex';
        },

        // Renders an error message if the API call fails
        renderErrorState() {
            this.elements.loadingContainer.innerHTML = `
                <div class="error-state">
                    <h3>Error loading articles</h3>
                    <p>Please try refreshing the page.</p>
                    <button onclick="location.reload()">Refresh</button>
                </div>`;
            this.elements.loadingContainer.style.display = 'flex';
        },

        // Shows or hides the infinite scroll loading indicator
        toggleLoadingIndicator(show) {
            let indicator = this.elements.footer.querySelector('.loading-indicator');
            if (show) {
                if (!indicator) {
                    indicator = document.createElement('div');
                    indicator.className = 'loading-indicator';
                    indicator.innerHTML = `<div class="spinner"></div><p>Loading more articles...</p>`;
                    this.elements.footer.insertAdjacentElement('beforebegin', indicator);
                }
                indicator.style.display = 'block';
            } else {
                if (indicator) {
                    indicator.style.display = 'none';
                }
            }
        },

        // Helper function to calculate time since an article was posted
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

        // Renders the profile modal
        renderProfileModal(user) {
            if (this.elements.profileModal) {
                document.body.removeChild(this.elements.profileModal);
                this.elements.profileModal = null;
            }

            const modal = document.createElement('div');
            modal.className = 'profile-modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h2><i class="fas fa-user"></i> Profile</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="profile-info" id="profileInfo">
                            <div class="profile-display active">
                                <div class="profile-field">
                                    <label>Name</label>
                                    <input type="text" value="${user.name}" disabled>
                                </div>
                                <div class="profile-field">
                                    <label>Email</label>
                                    <input type="email" value="${user.email}" disabled>
                                </div>
                                <div class="profile-field">
                                    <label>Member Since</label>
                                    <input type="text" value="${new Date(user.createdAt).toLocaleDateString()}" disabled>
                                </div>
                            </div>
                            <div class="profile-edit">
                                <div class="profile-field">
                                    <label>Name</label>
                                    <input type="text" id="editName" value="${user.name}">
                                </div>
                                <div class="profile-field">
                                    <label>Email</label>
                                    <input type="email" id="editEmail" value="${user.email}">
                                </div>
                                <div class="save-cancel-buttons">
                                    <button class="save-btn" id="saveProfileBtn">
                                        <i class="fas fa-save"></i> Save Changes
                                    </button>
                                    <button class="cancel-btn" id="cancelEditBtn">
                                        <i class="fas fa-times"></i> Cancel
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div class="profile-actions">
                            <button class="edit-profile-btn" id="editProfileBtn">
                                <i class="fas fa-edit"></i> Edit Profile
                            </button>
                            <button class="logout-btn" id="logoutBtn">
                                <i class="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
            this.elements.profileModal = modal;
            document.body.style.overflow = 'hidden'; // Prevent scrolling background
        },

        // Closes the profile modal
        closeProfileModal() {
            if (this.elements.profileModal) {
                document.body.removeChild(this.elements.profileModal);
                this.elements.profileModal = null;
                document.body.style.overflow = '';
            }
        },

        // Toggles between profile display and edit mode
        toggleProfileEditMode(isEditMode) {
            const display = this.elements.profileModal.querySelector('.profile-display');
            const edit = this.elements.profileModal.querySelector('.profile-edit');
            const saveCancel = this.elements.profileModal.querySelector('.save-cancel-buttons');
            const profileActions = this.elements.profileModal.querySelector('.profile-actions');

            if (isEditMode) {
                display.classList.remove('active');
                edit.classList.add('active');
                saveCancel.classList.add('active');
                profileActions.style.display = 'none';
            } else {
                edit.classList.remove('active');
                display.classList.add('active');
                saveCancel.classList.remove('active');
                profileActions.style.display = 'flex';
            }
        },

        // Updates the profile button in the header/bottom nav
        updateProfileButton(user) {
            const profileBtnSpan = document.querySelector('.bottom-nav .nav-item:last-child span');
            if (profileBtnSpan) {
                profileBtnSpan.textContent = user.name.split(' ')[0]; // First name only
            }
        },

        // Shows a temporary success message in the profile modal
        showProfileSuccess(message) {
            const successDiv = document.createElement('div');
            successDiv.className = 'profile-message success';
            successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
            const modalBody = this.elements.profileModal.querySelector('.modal-body');
            modalBody.insertBefore(successDiv, modalBody.firstChild);
            setTimeout(() => successDiv.remove(), 3000);
        },

        // Shows a temporary error message in the profile modal
        showProfileError(message) {
            const errorDiv = document.createElement('div');
            errorDiv.className = 'profile-message error';
            errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
            const modalBody = this.elements.profileModal.querySelector('.modal-body');
            modalBody.insertBefore(errorDiv, modalBody.firstChild);
            setTimeout(() => errorDiv.remove(), 5000);
        },

        // Resets the article submission form
        resetArticleForm() {
            this.elements.articleForm.reset();
            this.elements.titleCount.textContent = '0/100';
            this.elements.bodyCount.textContent = '0/450';
            this.elements.imagePreview.style.display = 'none';
            this.elements.fileUploadArea.style.display = 'block';
            this.elements.articleImage.value = '';
            this.elements.submitArticleBtn.disabled = false;
            this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Article';
        },

        // Opens the article submission modal
        openArticleFormModal() {
            this.elements.articleFormModal.classList.add('active');
            document.body.style.overflow = 'hidden';
        },

        // Closes the article submission modal
        closeArticleFormModal() {
            this.elements.articleFormModal.classList.remove('active');
            document.body.style.overflow = '';
            this.resetArticleForm();
        },

        // Updates character counts for article form
        updateCharCount(inputElement, countElement, maxLength) {
            countElement.textContent = `${inputElement.value.length}/${maxLength}`;
        },

        // Handles image preview for article submission
        handleImagePreview(file) {
            if (file && file.type.startsWith('image/')) {
                if (file.size > 5 * 1024 * 1024) { // 5MB limit
                    alert('File size must be less than 5MB');
                    return false;
                }

                const reader = new FileReader();
                reader.onload = (e) => {
                    this.elements.previewImg.src = e.target.result;
                    this.elements.imagePreview.style.display = 'block';
                    this.elements.fileUploadArea.style.display = 'none';
                };
                reader.readAsDataURL(file);
                return true;
            } else {
                alert('Please select a valid image file');
                return false;
            }
        }
    };

    /**
     * ------------------------------------------------------------------------
     * CONTROLLER
     * - The brain of the application.
     * - Connects the Model and the View.
     * - Handles user input and application logic.
     * ------------------------------------------------------------------------
     */
    const Controller = {
        isLoading: false,
        scrollObserver: null,
        lastIsMobileView: null, // Track previous view state for resize handling

        // Initializes the application
        async init() {
            console.log("Controller.init() called.");
            document.addEventListener('DOMContentLoaded', async () => {
                console.log("DOMContentLoaded fired.");
                // Perform initial authentication check
                await this.checkAuthStatus();

                const articles = await Model.fetchArticles();
                if (articles === null) {
                    View.renderErrorState();
                } else {
                    this.lastIsMobileView = this.isMobileView(); // Initialize last view state
                    this.renderContentBasedOnView(articles);
                    this.setupEventListeners();
                    window.addEventListener('resize', this.handleResize.bind(this));
                }
            });
        },

        // Performs authentication check and updates UI or redirects
        async checkAuthStatus() {
            console.log("Controller.checkAuthStatus() called.");
            try {
                const response = await fetch('/api/auth/status');
                const data = await response.json();
                
                if (data.authenticated) {
                    View.updateProfileButton(data.user);
                } else {
                    console.log("Not authenticated, redirecting to /login");
                    window.location.href = '/login';
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                window.location.href = '/login';
            }
        },

        // Determines whether the current view is mobile
        isMobileView() {
            const isMobile = window.innerWidth <= 768; // Matches the media query breakpoint in style.css
            console.log(`isMobileView: ${isMobile}, window.innerWidth: ${window.innerWidth}`);
            return isMobile;
        },

        // Renders content based on whether it's mobile or desktop view
        renderContentBasedOnView(articles) {
            const isMobile = this.isMobileView();
            console.log(`renderContentBasedOnView: isMobile = ${isMobile}`);
            View.renderInitialLayout(articles, isMobile);
            this.toggleInfiniteScroll(isMobile);
        },

        // Toggles infinite scroll on/off based on view (simplified for now)
        toggleInfiniteScroll(enable) {
            console.log(`toggleInfiniteScroll: enable = ${enable}`);
            if (this.scrollObserver) {
                console.log("toggleInfiniteScroll: disconnecting existing observer.");
                this.scrollObserver.disconnect();
                this.scrollObserver = null;
            }

            if (enable && View.elements.footer) {
                console.log("toggleInfiniteScroll: enabling observer.");
                this.scrollObserver = new IntersectionObserver(this.handleInfiniteScroll.bind(this), { threshold: 0.1 });
                this.scrollObserver.observe(View.elements.footer);
            } else if (!enable) {
                console.log("toggleInfiniteScroll: infinite scroll disabled for desktop.");
                View.toggleLoadingIndicator(false);
            }
        },

        // Handles window resize to adjust content rendering
        handleResize() {
            // Debounce resize events for performance
            clearTimeout(this.resizeTimeout);
            this.resizeTimeout = setTimeout(() => {
                const currentIsMobile = this.isMobileView();
                // Only re-render if view mode changed
                if (currentIsMobile !== this.lastIsMobileView) {
                    console.log(`Resize: View mode changed from ${this.lastIsMobileView} to ${currentIsMobile}. Re-rendering.`);
                    this.lastIsMobileView = currentIsMobile;
                    this.renderContentBasedOnView(Model.articles);
                }
            }, 200);
        },

        // Sets up all event listeners for the application
        setupEventListeners() {
            console.log("Controller.setupEventListeners() called.");
            // Profile functionality
            const profileBtn = document.querySelector('.bottom-nav .nav-item:last-child');
            if (profileBtn) {
                profileBtn.addEventListener('click', this.handleProfileClick.bind(this));
            }

            // Article submission functionality
            if (View.elements.addArticleBtn) {
                View.elements.addArticleBtn.addEventListener('click', this.handleOpenArticleForm.bind(this));
            }
            if (View.elements.closeArticleForm) {
                View.elements.closeArticleForm.addEventListener('click', this.handleCloseArticleForm.bind(this));
            }
            if (View.elements.cancelArticle) {
                View.elements.cancelArticle.addEventListener('click', this.handleCloseArticleForm.bind(this));
            }
            if (View.elements.articleForm) {
                View.elements.articleForm.addEventListener('submit', this.handleArticleSubmission.bind(this));
            }
            if (View.elements.fileUploadArea) {
                View.elements.fileUploadArea.addEventListener('click', () => View.elements.articleImage.click());
                View.elements.fileUploadArea.addEventListener('dragover', (e) => {
                    e.preventDefault();
                    View.elements.fileUploadArea.style.borderColor = '#5a6fd8';
                    View.elements.fileUploadArea.style.background = '#f0f2ff';
                });
                View.elements.fileUploadArea.addEventListener('dragleave', (e) => {
                    e.preventDefault();
                    View.elements.fileUploadArea.style.borderColor = '#667eea';
                    View.elements.fileUploadArea.style.background = '#f8f9ff';
                });
                View.elements.fileUploadArea.addEventListener('drop', (e) => {
                    e.preventDefault();
                    View.elements.fileUploadArea.style.borderColor = '#667eea';
                    View.elements.fileUploadArea.style.background = '#f8f9ff';
                    const files = e.dataTransfer.files;
                    if (files.length > 0) {
                        View.handleImagePreview(files[0]);
                    }
                });
            }
            if (View.elements.articleImage) {
                View.elements.articleImage.addEventListener('change', (e) => {
                    if (e.target.files.length > 0) {
                        View.handleImagePreview(e.target.files[0]);
                    }
                });
            }
            if (View.elements.removeImage) {
                View.elements.removeImage.addEventListener('click', () => {
                    View.elements.imagePreview.style.display = 'none';
                    View.elements.fileUploadArea.style.display = 'block';
                    View.elements.articleImage.value = '';
                });
            }
            if (View.elements.titleInput) {
                View.elements.titleInput.addEventListener('input', () => View.updateCharCount(View.elements.titleInput, View.elements.titleCount, 100));
            }
            if (View.elements.bodyInput) {
                View.elements.bodyInput.addEventListener('input', () => View.updateCharCount(View.elements.bodyInput, View.elements.bodyCount, 450));
            }

            // Close modals on backdrop click
            if (View.elements.articleFormModal) {
                View.elements.articleFormModal.addEventListener('click', (e) => {
                    if (e.target === View.elements.articleFormModal) {
                        this.handleCloseArticleForm();
                    }
                });
            }
        },

        // Handles the infinite scroll logic (simplified for now)
        handleInfiniteScroll(entries) {
            console.log("handleInfiniteScroll: IntersectionObserver fired.", 
                        "isIntersecting:", entries[0].isIntersecting, 
                        "Model.articles.length:", Model.articles.length);
            if (entries[0].isIntersecting && !this.isLoading && Model.articles.length > 0) {
                this.isLoading = true;
                View.toggleLoadingIndicator(true);
                
                // Simulate network delay for a better user experience
                setTimeout(() => {
                    const nextBatch = Model.getNextBatch();
                    View.renderArticleGrid(nextBatch);
                    View.toggleLoadingIndicator(false);
                    this.isLoading = false;
                }, 1000);
            }
        },

        // Handles profile button click
        async handleProfileClick(e) {
            e.preventDefault();
            View.renderProfileModal({ name: 'Loading...', email: 'Loading...', createdAt: new Date().toISOString() }); // Show loading state
            try {
                const user = await Model.fetchProfile();
                if (user) {
                    View.renderProfileModal(user);
                    // Add event listeners specific to the profile modal after it's rendered
                    this.setupProfileModalListeners();
                } else {
                    View.closeProfileModal();
                    // Redirect to login if profile not found (e.g., session expired)
                    window.location.href = '/login';
                }
            } catch (error) {
                View.showProfileError('Failed to load profile.');
                View.closeProfileModal();
                console.error('Profile load error:', error);
            }
        },

        // Sets up event listeners for the dynamically created profile modal
        setupProfileModalListeners() {
            const modal = View.elements.profileModal;
            if (!modal) return;

            modal.querySelector('.close-modal').addEventListener('click', View.closeProfileModal.bind(View));
            modal.querySelector('#editProfileBtn').addEventListener('click', this.handleEditProfile.bind(this));
            modal.querySelector('#logoutBtn').addEventListener('click', this.handleLogout.bind(this));
            modal.querySelector('#saveProfileBtn').addEventListener('click', this.handleSaveProfile.bind(this));
            modal.querySelector('#cancelEditBtn').addEventListener('click', this.handleCancelEditProfile.bind(this));
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    View.closeProfileModal();
                }
            });
        },

        // Handles edit profile button click
        handleEditProfile() {
            View.toggleProfileEditMode(true);
        },

        // Handles cancel edit profile button click
        handleCancelEditProfile() {
            View.toggleProfileEditMode(false);
        },

        // Handles saving profile changes
        async handleSaveProfile() {
            const nameInput = View.elements.profileModal.querySelector('#editName');
            const emailInput = View.elements.profileModal.querySelector('#editEmail');
            const name = nameInput.value;
            const email = emailInput.value;

            if (!name || !email) {
                View.showProfileError('Name and email are required.');
                return;
            }

            try {
                const updatedUser = await Model.updateProfile(name, email);
                View.renderProfileModal(updatedUser); // Re-render modal with updated data
                View.updateProfileButton(updatedUser);
                View.showProfileSuccess('Profile updated successfully!');
                this.setupProfileModalListeners(); // Re-attach listeners after re-render
            } catch (error) {
                View.showProfileError(error.message || 'Failed to update profile.');
                console.error('Profile update error:', error);
            }
        },

        // Handles user logout
        async handleLogout() {
            if (await Model.logout()) {
                window.location.href = '/login';
            } else {
                View.showProfileError('Failed to log out.');
            }
        },

        // Handles opening the article submission form
        handleOpenArticleForm(e) {
            e.preventDefault();
            View.openArticleFormModal();
        },

        // Handles closing the article submission form
        handleCloseArticleForm() {
            View.closeArticleFormModal();
        },

        // Handles article submission
        async handleArticleSubmission(e) {
            e.preventDefault();
            
            const formData = new FormData(View.elements.articleForm);
            
            // Basic validation
            if (!formData.get('title') || !formData.get('body') || !formData.get('tag') || !formData.get('image')) {
                alert('Please fill in all required fields');
                return;
            }

            if (formData.get('title').length > 100) {
                alert('Title must be 100 characters or less');
                return;
            }

            if (formData.get('body').length > 450) {
                alert('Article body must be 450 characters or less');
                return;
            }

            View.elements.submitArticleBtn.disabled = true;
            View.elements.submitArticleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';

            try {
                await Model.submitArticle(formData);
                alert('Article submitted successfully! It will be reviewed before being published.');
                View.closeArticleFormModal();
                // Reload articles to show the new one (if approved by default or after admin approval)
                const articles = await Model.fetchArticles();
                if (articles !== null) {
                    // Re-render content based on current view (mobile/desktop)
                    Controller.renderContentBasedOnView(articles);
                }
            } catch (error) {
                alert(error.message || 'Failed to submit article');
                console.error('Article submission error:', error);
            }
        }
    };

    // Start the application
    Controller.init();