/**
 * ProfileController - Profile Page Controller
 * Handles all profile page interactions and data management
 */
const ProfileController = {
    currentUser: null,

    /**
     * Initializes the profile page
     */
    async init() {
        console.log('ProfileController.init() called');
        
        // Check authentication
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            window.location.href = '/login.html';
            return;
        }

        // Set up event listeners
        this.setupEventListeners();

        // Load user profile
        await this.loadUserProfile();
    },

    /**
     * Sets up all event listeners for the profile page
     */
    setupEventListeners() {
        // Back button
        const backBtn = document.getElementById('backBtn');
        if (backBtn) {
            backBtn.addEventListener('click', () => this.handleBackClick());
        }

        // Edit profile button
        const editBtn = document.getElementById('editProfileBtn');
        if (editBtn) {
            editBtn.addEventListener('click', () => this.toggleEditMode(true));
        }

        // Save profile button
        const saveBtn = document.getElementById('saveProfileBtn');
        if (saveBtn) {
            saveBtn.addEventListener('click', () => this.saveProfile());
        }

        // Cancel edit button
        const cancelBtn = document.getElementById('cancelEditBtn');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.toggleEditMode(false));
        }

        // Logout button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.handleLogout());
        }

        // Admin panel button
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        if (adminPanelBtn) {
            adminPanelBtn.addEventListener('click', () => {
                window.location.href = '/admin.html';
            });
        }
    },

    /**
     * Loads and displays user profile data
     */
    async loadUserProfile() {
        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('No authentication token');
            }

            // Try to get user from auth status endpoint first
            let userData = null;
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

            // Fallback to profile API
            if (!userData) {
                const profileResponse = await fetch('/api/profile', {
                    headers: {
                        'Authorization': `Bearer ${authToken}`
                    }
                });
                const profileData = await profileResponse.json();
                if (profileData.success && profileData.user) {
                    userData = profileData.user;
                }
            }

        if (userData) {
            this.currentUser = userData;
            this.renderProfile(userData);
            // Update navigation icon on profile page
            this.updateNavigationIcon(userData);
        } else {
            throw new Error('Failed to load user profile');
        }
        } catch (error) {
            console.error('Error loading profile:', error);
            this.showError('Failed to load profile. Please try again.');
        }
    },

    /**
     * Renders the profile with user data
     * @param {Object} user - User profile data
     */
    renderProfile(user) {
        // Render avatar
        this.renderAvatar(user);

        // Render name and email
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        if (profileName) profileName.textContent = user.name || 'User';
        if (profileEmail) profileEmail.textContent = user.email || '';

        // Render display values
        const displayName = document.getElementById('displayName');
        const displayEmail = document.getElementById('displayEmail');
        const displayMemberSince = document.getElementById('displayMemberSince');

        if (displayName) displayName.textContent = user.name || '-';
        if (displayEmail) displayEmail.textContent = user.email || '-';
        if (displayMemberSince) {
            const memberSince = user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '-';
            displayMemberSince.textContent = memberSince;
        }

        // Populate edit inputs
        const editName = document.getElementById('editName');
        const editEmail = document.getElementById('editEmail');
        if (editName) editName.value = user.name || '';
        if (editEmail) editEmail.value = user.email || '';

        // Show/hide admin actions
        const adminActions = document.getElementById('adminActions');
        if (adminActions) {
            if (user.isSuperAdmin === true) {
                adminActions.style.display = 'block';
            } else {
                adminActions.style.display = 'none';
            }
        }
    },

    /**
     * Renders the avatar with super admin indicator
     * @param {Object} user - User profile data
     */
    async renderAvatar(user) {
        const avatarContainer = document.getElementById('profileAvatar');
        const avatarBadge = document.getElementById('avatarBadge');
        
        if (!avatarContainer) return;
        
        if (user.isSuperAdmin === true) {
            // Super admin: Bull logo - fetch from API
            let bullLogoUrl = 'Bull.png'; // Fallback
            
            try {
                const response = await fetch('/api/bull-logo');
                const data = await response.json();
                if (data.success && data.url) {
                    bullLogoUrl = data.url;
                }
            } catch (error) {
                console.error('Error fetching bull logo:', error);
            }
            
            avatarContainer.innerHTML = `<img src="${bullLogoUrl}" alt="Super Admin" class="avatar-bull-logo" onerror="this.src='Bull.png'">`;
            avatarContainer.classList.add('super-admin');
            
            if (avatarBadge) {
                avatarBadge.style.display = 'flex';
                avatarBadge.innerHTML = '<i class="fas fa-star"></i>';
            }
        } else {
            // Regular user: User icon
            avatarContainer.innerHTML = '<i class="fas fa-user"></i>';
            avatarContainer.classList.remove('super-admin');
            
            if (avatarBadge) {
                avatarBadge.style.display = 'none';
            }
        }
    },

    /**
     * Toggles between display and edit modes
     * @param {boolean} isEditMode - Whether to show edit mode
     */
    toggleEditMode(isEditMode) {
        const display = document.getElementById('profileDisplay');
        const edit = document.getElementById('profileEdit');
        const profileActions = document.getElementById('profileActions');

        if (isEditMode) {
            if (display) display.style.display = 'none';
            if (edit) edit.style.display = 'block';
            if (profileActions) profileActions.style.display = 'none';
        } else {
            if (display) display.style.display = 'block';
            if (edit) edit.style.display = 'none';
            if (profileActions) profileActions.style.display = 'flex';
            
            // Reset edit inputs to current values
            if (this.currentUser) {
                const editName = document.getElementById('editName');
                const editEmail = document.getElementById('editEmail');
                if (editName) editName.value = this.currentUser.name || '';
                if (editEmail) editEmail.value = this.currentUser.email || '';
            }
        }
    },

    /**
     * Saves profile changes
     */
    async saveProfile() {
        const editName = document.getElementById('editName');
        const editEmail = document.getElementById('editEmail');
        
        if (!editName || !editEmail) {
            this.showError('Form elements not found');
            return;
        }

        const name = editName.value.trim();
        const email = editEmail.value.trim();

        if (!name || !email) {
            this.showError('Name and email are required');
            return;
        }

        try {
            const authToken = localStorage.getItem('authToken');
            if (!authToken) {
                throw new Error('No authentication token');
            }

            const response = await fetch('/api/profile', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name, email })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to update profile');
            }

            if (data.success && data.user) {
                this.currentUser = data.user;
                this.renderProfile(data.user);
                this.toggleEditMode(false);
                this.showSuccess('Profile updated successfully!');
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Error saving profile:', error);
            this.showError(error.message || 'Failed to update profile');
        }
    },

    /**
     * Handles back button click - navigates to main page
     */
    handleBackClick() {
        window.location.href = '/index.html';
    },

    /**
     * Handles user logout
     */
    async handleLogout() {
        try {
            const response = await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });

            if (response.ok) {
                localStorage.removeItem('authToken');
                localStorage.removeItem('isSuperAdmin');
                window.location.href = '/login.html';
            } else {
                throw new Error('Logout failed');
            }
        } catch (error) {
            console.error('Error logging out:', error);
            // Still clear local storage and redirect
            localStorage.removeItem('authToken');
            localStorage.removeItem('isSuperAdmin');
            window.location.href = '/login.html';
        }
    },

    /**
     * Shows a success message
     * @param {string} message - Success message
     */
    showSuccess(message) {
        // Create or update success message element
        let messageDiv = document.getElementById('profileMessage');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'profileMessage';
            messageDiv.className = 'profile-message success';
            const profileInfoSection = document.querySelector('.profile-info-section');
            if (profileInfoSection) {
                profileInfoSection.insertBefore(messageDiv, profileInfoSection.firstChild);
            }
        }
        messageDiv.className = 'profile-message success';
        messageDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        messageDiv.style.display = 'block';

        setTimeout(() => {
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        }, 3000);
    },

    /**
     * Shows an error message
     * @param {string} message - Error message
     */
    showError(message) {
        // Create or update error message element
        let messageDiv = document.getElementById('profileMessage');
        if (!messageDiv) {
            messageDiv = document.createElement('div');
            messageDiv.id = 'profileMessage';
            messageDiv.className = 'profile-message error';
            const profileInfoSection = document.querySelector('.profile-info-section');
            if (profileInfoSection) {
                profileInfoSection.insertBefore(messageDiv, profileInfoSection.firstChild);
            }
        }
        messageDiv.className = 'profile-message error';
        messageDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        messageDiv.style.display = 'block';

        setTimeout(() => {
            if (messageDiv) {
                messageDiv.style.display = 'none';
            }
        }, 5000);
    },

    /**
     * Updates the navigation icon on the profile page
     * @param {Object} user - User profile data
     */
    async updateNavigationIcon(user) {
        const regularIcon = document.getElementById('regularUserIcon');
        const superAdminLogo = document.getElementById('superAdminLogo');
        const iconWrapper = document.querySelector('.profile-icon-wrapper');
        
        if (user && user.isSuperAdmin === true) {
            if (regularIcon) regularIcon.style.display = 'none';
            if (superAdminLogo) {
                // Fetch bull logo URL from API
                try {
                    const response = await fetch('/api/bull-logo');
                    const data = await response.json();
                    if (data.success && data.url) {
                        superAdminLogo.src = data.url;
                    } else {
                        // Fallback to local file
                        superAdminLogo.src = 'Bull.png';
                    }
                } catch (error) {
                    console.error('Error fetching bull logo:', error);
                    // Fallback to local file
                    superAdminLogo.src = 'Bull.png';
                }
                superAdminLogo.style.display = 'block';
                if (iconWrapper) iconWrapper.classList.add('has-super-admin');
            }
        } else {
            if (regularIcon) regularIcon.style.display = 'block';
            if (superAdminLogo) {
                superAdminLogo.style.display = 'none';
                if (iconWrapper) iconWrapper.classList.remove('has-super-admin');
            }
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileController;
}

