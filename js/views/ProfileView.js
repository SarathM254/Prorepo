/**
 * ProfileView - Profile Modal Rendering
 * Handles rendering and management of the profile modal
 */
const ProfileView = {
    profileModal: null,

    /**
     * Renders the profile modal with user data
     * @param {Object} user - User profile data
     */
    renderProfileModal(user) {
        if (this.profileModal) {
            document.body.removeChild(this.profileModal);
            this.profileModal = null;
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
                        ${user.isSuperAdmin ? `
                            <button class="admin-panel-btn" id="adminPanelBtn" style="background: #FFD700; color: #333; margin-bottom: 10px;">
                                <i class="fas fa-crown"></i> Admin Panel
                            </button>
                        ` : ''}
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
        this.profileModal = modal;
        document.body.style.overflow = 'hidden';
    },

    /**
     * Closes the profile modal
     */
    closeProfileModal() {
        if (this.profileModal) {
            document.body.removeChild(this.profileModal);
            this.profileModal = null;
            document.body.style.overflow = '';
        }
    },

    /**
     * Toggles between profile display and edit mode
     * @param {boolean} isEditMode - Whether to show edit mode
     */
    toggleProfileEditMode(isEditMode) {
        const display = this.profileModal.querySelector('.profile-display');
        const edit = this.profileModal.querySelector('.profile-edit');
        const saveCancel = this.profileModal.querySelector('.save-cancel-buttons');
        const profileActions = this.profileModal.querySelector('.profile-actions');

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

    /**
     * Updates the profile button in the navigation
     * @param {Object} user - User profile data
     */
    updateProfileButton(user) {
        const profileBtnSpan = document.querySelector('.bottom-nav .nav-item:last-child span');
        const regularIcon = document.getElementById('regularUserIcon');
        const superAdminLogo = document.getElementById('superAdminLogo');
        const iconWrapper = document.querySelector('.profile-icon-wrapper');
        
        if (profileBtnSpan && user && user.name) {
            profileBtnSpan.textContent = user.name.split(' ')[0];
        } else if (profileBtnSpan) {
            profileBtnSpan.textContent = 'Profile';
        }
        
        // Replace icon for super admin (instead of overlaying)
        if (user && user.isSuperAdmin === true) {
            if (regularIcon) regularIcon.style.display = 'none';
            if (superAdminLogo) {
                // Ensure logo URL is set (should already be in HTML, but set as fallback)
                if (!superAdminLogo.src || superAdminLogo.src === window.location.href) {
                    if (window.BULL_LOGO_URL) {
                        superAdminLogo.src = window.BULL_LOGO_URL;
                    }
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
    },

    /**
     * Shows a success message in the profile modal
     * @param {string} message - Success message
     */
    showProfileSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.className = 'profile-message success';
        successDiv.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        const modalBody = this.profileModal.querySelector('.modal-body');
        modalBody.insertBefore(successDiv, modalBody.firstChild);
        setTimeout(() => successDiv.remove(), 3000);
    },

    /**
     * Shows an error message in the profile modal
     * @param {string} message - Error message
     */
    showProfileError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'profile-message error';
        errorDiv.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${message}`;
        const modalBody = this.profileModal.querySelector('.modal-body');
        modalBody.insertBefore(errorDiv, modalBody.firstChild);
        setTimeout(() => errorDiv.remove(), 5000);
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ProfileView;
}

