/**
 * AdminPanelView - Admin Panel Modal View
 * Handles rendering of admin panel in full-screen modal (desktop) or popup message (mobile)
 */
const AdminPanelView = {
    adminModal: null,
    isMobile: () => window.innerWidth <= 768,

    /**
     * Renders the admin panel modal
     * Desktop: Full-screen admin panel
     * Mobile: Popup message to use desktop view
     */
    renderAdminPanel() {
        if (this.adminModal) {
            document.body.removeChild(this.adminModal);
            this.adminModal = null;
        }

        const modal = document.createElement('div');
        modal.className = 'admin-panel-modal';
        
        if (this.isMobile()) {
            // Mobile: Show message popup
            modal.innerHTML = `
                <div class="modal-content mobile-admin-message">
                    <div class="modal-header">
                        <h2><i class="fas fa-crown"></i> Admin Panel</h2>
                        <button class="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="mobile-message-content">
                            <i class="fas fa-desktop" style="font-size: 3rem; color: #667eea; margin-bottom: 1rem;"></i>
                            <h3>Desktop View Required</h3>
                            <p>Admin controls are available in desktop view only.</p>
                            <p>Please access the admin panel from a desktop or tablet device (width > 768px).</p>
                            <button class="close-message-btn" onclick="AdminPanelView.closeAdminPanel()">
                                <i class="fas fa-times"></i> Close
                            </button>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Desktop: Full-screen admin panel
            modal.innerHTML = `
                <div class="admin-panel-fullscreen">
                    <div class="admin-panel-header">
                        <h1><i class="fas fa-crown"></i> Admin Panel</h1>
                        <button class="close-admin-panel" onclick="AdminPanelView.closeAdminPanel()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                    <div class="admin-panel-content">
                        <div id="adminErrorMessage" class="error-message" style="display: none;"></div>
                        <div id="adminSuccessMessage" class="success-message" style="display: none;"></div>

                        <!-- Create User Section -->
                        <div class="admin-section">
                            <h2><i class="fas fa-user-plus"></i> Create New User</h2>
                            <div class="create-user-form">
                                <form id="createUserForm">
                                    <div class="form-row">
                                        <div class="form-group">
                                            <label for="newUserName">Name</label>
                                            <input type="text" id="newUserName" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="newUserEmail">Email</label>
                                            <input type="email" id="newUserEmail" required>
                                        </div>
                                        <div class="form-group">
                                            <label for="newUserPassword">Password</label>
                                            <input type="password" id="newUserPassword" required minlength="6">
                                        </div>
                                    </div>
                                    <button type="submit" class="submit-btn">
                                        <i class="fas fa-plus"></i> Create User
                                    </button>
                                </form>
                            </div>
                        </div>

                        <!-- Users List Section -->
                        <div class="admin-section">
                            <h2><i class="fas fa-users"></i> All Users</h2>
                            <div id="adminUsersList">
                                <div class="loading">
                                    <i class="fas fa-spinner fa-spin"></i> Loading users...
                                </div>
                            </div>
                        </div>

                        <!-- Bulk Actions -->
                        <div class="bulk-actions">
                            <h3 style="margin-top: 0; color: #856404;">⚠️ Dangerous Actions</h3>
                            <p style="color: #856404; margin-bottom: 15px;">
                                Delete all users except super admin. This action cannot be undone!
                            </p>
                            <button id="deleteAllUsersBtn">
                                <i class="fas fa-trash"></i> Delete All Users (Except Super Admin)
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }

        document.body.appendChild(modal);
        this.adminModal = modal;
        document.body.style.overflow = 'hidden';

        // Initialize admin panel if desktop
        if (!this.isMobile()) {
            setTimeout(() => {
                if (typeof AdminController !== 'undefined') {
                    AdminController.initInModal();
                }
            }, 100);
        }
    },

    /**
     * Closes the admin panel modal
     */
    closeAdminPanel() {
        if (this.adminModal) {
            document.body.removeChild(this.adminModal);
            this.adminModal = null;
            document.body.style.overflow = '';
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminPanelView;
}

