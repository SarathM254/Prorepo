/**
 * AdminController - Admin Panel Controller
 * Handles all admin panel functionality
 */

const AdminController = {
    /**
     * Initialize admin panel
     */
    async init() {
        // Check if user is super admin
        const isSuperAdmin = await this.checkSuperAdminAccess();
        if (!isSuperAdmin) {
            this.showError('Access denied. Super admin access required.');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
            return;
        }

        // Load users
        await this.loadAllUsers();

        // Setup event listeners
        this.setupEventListeners();
    },

    /**
     * Check if current user is super admin
     */
    async checkSuperAdminAccess() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            return false;
        }

        try {
            const response = await fetch('/api/auth/status', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            return data.authenticated && data.user && data.user.isSuperAdmin === true;
        } catch (error) {
            console.error('Super admin check error:', error);
            return false;
        }
    },

    /**
     * Load all users from API
     */
    async loadAllUsers() {
        const usersListDiv = document.getElementById('usersList');
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 401) {
                    throw new Error('Super admin access required');
                }
                throw new Error('Failed to load users');
            }

            const data = await response.json();
            if (data.success && data.users) {
                this.renderUsersList(data.users);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Load users error:', error);
            usersListDiv.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-circle"></i> ${error.message}
                </div>
            `;
        }
    },

    /**
     * Render users list in table
     */
    renderUsersList(users) {
        const usersListDiv = document.getElementById('usersList');

        if (users.length === 0) {
            usersListDiv.innerHTML = '<p>No users found.</p>';
            return;
        }

        let tableHTML = `
            <table class="users-table">
                <thead>
                    <tr>
                        <th>Name</th>
                        <th>Email</th>
                        <th>Role</th>
                        <th>Created</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
        `;

        users.forEach(user => {
            const createdDate = user.created_at 
                ? new Date(user.created_at).toLocaleDateString() 
                : 'N/A';
            
            const roleBadge = user.isSuperAdmin 
                ? '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>'
                : '<span>User</span>';

            tableHTML += `
                <tr>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>${roleBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        ${!user.isSuperAdmin ? `
                            <button class="delete-btn" onclick="AdminController.deleteUser('${user.id}')">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        ` : '<span style="color: #999;">-</span>'}
                    </td>
                </tr>
            `;
        });

        tableHTML += `
                </tbody>
            </table>
        `;

        usersListDiv.innerHTML = tableHTML;
    },

    /**
     * Create a new user
     */
    async createUser(name, email, password) {
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name, email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess('User created successfully!');
                // Reset form
                document.getElementById('createUserForm').reset();
                // Reload users list
                await this.loadAllUsers();
            } else {
                throw new Error(data.error || 'Failed to create user');
            }
        } catch (error) {
            console.error('Create user error:', error);
            this.showError(error.message || 'Failed to create user');
        }
    },

    /**
     * Delete a specific user
     */
    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`/api/admin/users?userId=${userId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess('User deleted successfully!');
                await this.loadAllUsers();
            } else {
                throw new Error(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError(error.message || 'Failed to delete user');
        }
    },

    /**
     * Delete all users except super admin
     */
    async deleteAllUsers() {
        const confirmMessage = 'Are you absolutely sure you want to delete ALL users except super admin?\n\nThis action CANNOT be undone!';
        if (!confirm(confirmMessage)) {
            return;
        }

        const secondConfirm = confirm('This is your last chance. Click OK to permanently delete all users except super admin.');
        if (!secondConfirm) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(`Successfully deleted ${data.deletedCount || 0} users!`);
                await this.loadAllUsers();
            } else {
                throw new Error(data.error || 'Failed to delete users');
            }
        } catch (error) {
            console.error('Delete all users error:', error);
            this.showError(error.message || 'Failed to delete users');
        }
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Create user form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('newUserName').value.trim();
                const email = document.getElementById('newUserEmail').value.trim();
                const password = document.getElementById('newUserPassword').value;

                if (!name || !email || !password) {
                    this.showError('Please fill in all fields');
                    return;
                }

                if (password.length < 6) {
                    this.showError('Password must be at least 6 characters long');
                    return;
                }

                await this.createUser(name, email, password);
            });
        }

        // Delete all users button
        const deleteAllBtn = document.getElementById('deleteAllUsersBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllUsers();
            });
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        const successDiv = document.getElementById('successMessage');
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        successDiv.style.display = 'none';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        const errorDiv = document.getElementById('errorMessage');
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        errorDiv.style.display = 'none';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminController.init());
} else {
    AdminController.init();
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminController;
}

