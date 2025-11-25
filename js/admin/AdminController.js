/**
 * AdminController - Admin Panel Controller
 * Handles all admin panel functionality
 */

const AdminController = {
    /**
     * Initialize admin panel (for admin.html page)
     */
    async init() {
        // Check if user is admin or super admin
        const access = await this.checkAdminAccess();
        if (!access.hasAccess) {
            this.showError('Access denied. Admin access required.');
            setTimeout(() => {
                window.location.href = '/index.html';
            }, 2000);
            return;
        }

        // Store role information
        this.userRole = {
            isSuperAdmin: access.isSuperAdmin,
            isAdmin: access.isAdmin
        };

        // Hide users section if not super admin
        if (!access.isSuperAdmin) {
            const usersNavItem = document.querySelector('.nav-item[data-section="users"]');
            const usersSection = document.getElementById('usersSection');
            const usersStatCard = document.querySelector('.stat-card:has(#totalUsersCount)');
            
            if (usersNavItem) usersNavItem.style.display = 'none';
            if (usersSection) usersSection.style.display = 'none';
            // Hide user count stat card
            const totalUsersCount = document.getElementById('totalUsersCount');
            if (totalUsersCount) {
                const statCard = totalUsersCount.closest('.stat-card');
                if (statCard) statCard.style.display = 'none';
            }
        }

        // Load users
        await this.loadAllUsers();

        // Setup event listeners
        this.setupEventListeners();

        // Load dashboard statistics
        await this.updateDashboard();
    },

    /**
     * Update dashboard statistics
     */
    async updateDashboard() {
        const authToken = localStorage.getItem('authToken');
        
        try {
            // Load articles statistics
            const articlesResponse = await fetch('/api/admin/articles?limit=1000', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (articlesResponse.ok) {
                const articlesData = await articlesResponse.json();
                if (articlesData.success && articlesData.articles) {
                    const articles = articlesData.articles;
                    const totalArticles = articles.length;
                    const approvedArticles = articles.filter(a => a.status === 'approved').length;
                    const pendingArticles = articles.filter(a => a.status === 'pending').length;

                    // Update article counts
                    const totalArticlesCount = document.getElementById('totalArticlesCount');
                    const approvedArticlesCount = document.getElementById('approvedArticlesCount');
                    const pendingArticlesCount = document.getElementById('pendingArticlesCount');
                    const articlesBadge = document.getElementById('articlesBadge');

                    if (totalArticlesCount) totalArticlesCount.textContent = totalArticles;
                    if (approvedArticlesCount) approvedArticlesCount.textContent = approvedArticles;
                    if (pendingArticlesCount) pendingArticlesCount.textContent = pendingArticles;
                    if (articlesBadge) articlesBadge.textContent = totalArticles;
                }
            }

            // Load users statistics
            const usersResponse = await fetch('/api/admin/users', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                if (usersData.success && usersData.users) {
                    const totalUsers = usersData.users.length;
                    const totalUsersCount = document.getElementById('totalUsersCount');
                    const usersBadge = document.getElementById('usersBadge');

                    if (totalUsersCount) totalUsersCount.textContent = totalUsers;
                    if (usersBadge) usersBadge.textContent = totalUsers;
                }
            }

            // Update recent activity
            await this.updateRecentActivity();
        } catch (error) {
            console.error('Update dashboard error:', error);
        }
    },

    /**
     * Update recent activity
     */
    async updateRecentActivity() {
        const authToken = localStorage.getItem('authToken');
        const recentActivity = document.getElementById('recentActivity');

        if (!recentActivity) return;

        try {
            // Get recent articles
            const response = await fetch('/api/admin/articles?limit=5&page=1', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success && data.articles && data.articles.length > 0) {
                    let activityHTML = '<div class="activity-list">';
                    
                    data.articles.forEach(article => {
                        const date = new Date(article.created_at).toLocaleDateString();
                        const timeAgo = this.getTimeAgo(article.created_at);
                        const statusBadge = article.status === 'approved' 
                            ? '<span class="status-badge approved">Approved</span>'
                            : '<span class="status-badge pending">Pending</span>';

                        activityHTML += `
                            <div class="activity-item">
                                <div class="activity-icon">
                                    <i class="fas fa-newspaper"></i>
                                </div>
                                <div class="activity-content">
                                    <strong>${this.escapeHtml(article.title)}</strong>
                                    <p>${this.escapeHtml(article.author_name || 'Unknown')} • ${date} • ${timeAgo}</p>
                                </div>
                                <div class="activity-meta">
                                    ${statusBadge}
                                </div>
                            </div>
                        `;
                    });
                    
                    activityHTML += '</div>';
                    recentActivity.innerHTML = activityHTML;
                } else {
                    recentActivity.innerHTML = '<p class="text-muted">No recent activity</p>';
                }
            } else {
                recentActivity.innerHTML = '<p class="text-muted">Failed to load recent activity</p>';
            }
        } catch (error) {
            console.error('Update recent activity error:', error);
            recentActivity.innerHTML = '<p class="text-muted">Failed to load recent activity</p>';
        }
    },

    /**
     * Get time ago string
     */
    getTimeAgo(dateString) {
        if (typeof Helpers !== 'undefined' && Helpers.getTimeAgo) {
            return Helpers.getTimeAgo(dateString);
        }
        
        const now = new Date();
        const date = new Date(dateString);
        const diffInSeconds = Math.floor((now - date) / 1000);

        if (diffInSeconds < 60) return 'Just now';
        const minutes = Math.floor(diffInSeconds / 60);
        if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
        const days = Math.floor(hours / 24);
        return `${days} day${days > 1 ? 's' : ''} ago`;
    },

    /**
     * Initialize admin panel in modal (for embedded admin panel)
     */
    async initInModal() {
        // Check if user is super admin
        const isSuperAdmin = await this.checkSuperAdminAccess();
        if (!isSuperAdmin) {
            this.showErrorInModal('Access denied. Super admin access required.');
            setTimeout(() => {
                if (typeof AdminPanelView !== 'undefined') {
                    AdminPanelView.closeAdminPanel();
                }
            }, 2000);
            return;
        }

        // Load users
        await this.loadAllUsersInModal();

        // Setup event listeners for modal
        this.setupEventListenersInModal();
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
     * Check if current user has admin access (admin or super admin)
     */
    async checkAdminAccess() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            return { hasAccess: false };
        }

        try {
            const response = await fetch('/api/auth/status', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();
            
            if (data.authenticated && data.user && (data.user.isSuperAdmin || data.user.isAdmin)) {
                return {
                    hasAccess: true,
                    isSuperAdmin: data.user.isSuperAdmin || false,
                    isAdmin: data.user.isAdmin || false
                };
            }
            return { hasAccess: false };
        } catch (error) {
            console.error('Admin access check error:', error);
            return { hasAccess: false };
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
            
            let roleBadge = '';
            if (user.isSuperAdmin) {
                roleBadge = '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>';
            } else if (user.isAdmin) {
                roleBadge = '<span class="admin-badge" style="background: #667eea; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-shield-halved"></i> Admin</span>';
            } else {
                roleBadge = '<span>User</span>';
            }

            tableHTML += `
                <tr>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>${roleBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        ${!user.isSuperAdmin ? `
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${user.isAdmin ? `
                                    <button class="btn btn-secondary btn-sm" onclick="AdminController.demoteFromAdmin('${user.id}')" title="Remove Admin">
                                        <i class="fas fa-user-minus"></i> Remove Admin
                                    </button>
                                ` : `
                                    <button class="btn btn-primary btn-sm" onclick="AdminController.promoteToAdmin('${user.id}')" title="Make Admin">
                                        <i class="fas fa-user-plus"></i> Make Admin
                                    </button>
                                `}
                                <button class="delete-btn" onclick="AdminController.deleteUser('${user.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
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
                this.showSuccess(data.message || 'User deleted successfully! All sessions have been invalidated and the user must create a new account.');
                await this.loadAllUsers();
                await this.updateDashboard(); // Refresh dashboard stats
            } else {
                throw new Error(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showError(error.message || 'Failed to delete user');
        }
    },

    /**
     * Promote user to admin
     */
    async promoteToAdmin(userId) {
        if (!confirm('Are you sure you want to promote this user to admin? They will have access to the admin panel and can manage articles.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ userId, isAdmin: true })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message || 'User promoted to admin successfully!');
                await this.loadAllUsers();
            } else {
                throw new Error(data.error || 'Failed to promote user');
            }
        } catch (error) {
            console.error('Promote to admin error:', error);
            this.showError(error.message || 'Failed to promote user to admin');
        }
    },

    /**
     * Demote user from admin
     */
    async demoteFromAdmin(userId) {
        if (!confirm('Are you sure you want to remove admin privileges from this user? They will lose access to the admin panel.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ userId, isAdmin: false })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(data.message || 'User demoted from admin successfully!');
                await this.loadAllUsers();
            } else {
                throw new Error(data.error || 'Failed to demote user');
            }
        } catch (error) {
            console.error('Demote from admin error:', error);
            this.showError(error.message || 'Failed to demote user from admin');
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
     * Load all users from API (for modal mode)
     */
    async loadAllUsersInModal() {
        const usersListDiv = document.getElementById('adminUsersList');
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
                this.renderUsersListInModal(data.users);
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Load users error:', error);
            if (usersListDiv) {
                usersListDiv.innerHTML = `
                    <div class="error-message">
                        <i class="fas fa-exclamation-circle"></i> ${error.message}
                    </div>
                `;
            }
        }
    },

    /**
     * Render users list in modal
     */
    renderUsersListInModal(users) {
        const usersListDiv = document.getElementById('adminUsersList');

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
            
            let roleBadge = '';
            if (user.isSuperAdmin) {
                roleBadge = '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>';
            } else if (user.isAdmin) {
                roleBadge = '<span class="admin-badge" style="background: #667eea; color: white; padding: 0.25rem 0.75rem; border-radius: 4px; font-size: 0.8rem; font-weight: 600;"><i class="fas fa-shield-halved"></i> Admin</span>';
            } else {
                roleBadge = '<span>User</span>';
            }

            tableHTML += `
                <tr>
                    <td>${this.escapeHtml(user.name)}</td>
                    <td>${this.escapeHtml(user.email)}</td>
                    <td>${roleBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        ${!user.isSuperAdmin ? `
                            <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
                                ${user.isAdmin ? `
                                    <button class="btn btn-secondary btn-sm" onclick="AdminController.demoteFromAdminInModal('${user.id}')" title="Remove Admin">
                                        <i class="fas fa-user-minus"></i> Remove Admin
                                    </button>
                                ` : `
                                    <button class="btn btn-primary btn-sm" onclick="AdminController.promoteToAdminInModal('${user.id}')" title="Make Admin">
                                        <i class="fas fa-user-plus"></i> Make Admin
                                    </button>
                                `}
                                <button class="delete-btn" onclick="AdminController.deleteUserInModal('${user.id}')">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
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
     * Delete user in modal mode
     */
    async deleteUserInModal(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone. The user will need to create a new account.')) {
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
                this.showSuccessInModal(data.message || 'User deleted successfully! All sessions have been invalidated and the user must create a new account.');
                await this.loadAllUsersInModal();
            } else {
                throw new Error(data.error || 'Failed to delete user');
            }
        } catch (error) {
            console.error('Delete user error:', error);
            this.showErrorInModal(error.message || 'Failed to delete user');
        }
    },

    /**
     * Setup event listeners for modal
     */
    setupEventListenersInModal() {
        // Create user form
        const createUserForm = document.getElementById('createUserForm');
        if (createUserForm) {
            createUserForm.addEventListener('submit', async (e) => {
                e.preventDefault();
                const name = document.getElementById('newUserName').value.trim();
                const email = document.getElementById('newUserEmail').value.trim();
                const password = document.getElementById('newUserPassword').value;

                if (!name || !email || !password) {
                    this.showErrorInModal('Please fill in all fields');
                    return;
                }

                if (password.length < 6) {
                    this.showErrorInModal('Password must be at least 6 characters long');
                    return;
                }

                await this.createUserInModal(name, email, password);
            });
        }

        // Delete all users button
        const deleteAllBtn = document.getElementById('deleteAllUsersBtn');
        if (deleteAllBtn) {
            deleteAllBtn.addEventListener('click', () => {
                this.deleteAllUsersInModal();
            });
        }
    },

    /**
     * Create user in modal mode
     */
    async createUserInModal(name, email, password) {
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
                this.showSuccessInModal('User created successfully!');
                document.getElementById('createUserForm').reset();
                await this.loadAllUsersInModal();
            } else {
                throw new Error(data.error || 'Failed to create user');
            }
        } catch (error) {
            console.error('Create user error:', error);
            this.showErrorInModal(error.message || 'Failed to create user');
        }
    },

    /**
     * Promote user to admin in modal mode
     */
    async promoteToAdminInModal(userId) {
        if (!confirm('Are you sure you want to promote this user to admin? They will have access to the admin panel and can manage articles.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ userId, isAdmin: true })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccessInModal(data.message || 'User promoted to admin successfully!');
                await this.loadAllUsersInModal();
            } else {
                throw new Error(data.error || 'Failed to promote user');
            }
        } catch (error) {
            console.error('Promote to admin error:', error);
            this.showErrorInModal(error.message || 'Failed to promote user to admin');
        }
    },

    /**
     * Demote user from admin in modal mode
     */
    async demoteFromAdminInModal(userId) {
        if (!confirm('Are you sure you want to remove admin privileges from this user? They will lose access to the admin panel.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch('/api/admin/users', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ userId, isAdmin: false })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccessInModal(data.message || 'User demoted from admin successfully!');
                await this.loadAllUsersInModal();
            } else {
                throw new Error(data.error || 'Failed to demote user');
            }
        } catch (error) {
            console.error('Demote from admin error:', error);
            this.showErrorInModal(error.message || 'Failed to demote user from admin');
        }
    },

    /**
     * Delete all users in modal mode
     */
    async deleteAllUsersInModal() {
        const confirmMessage = 'Are you absolutely sure you want to delete ALL users except super admin?\n\nThis action CANNOT be undone! All deleted users will need to create new accounts.';
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
                this.showSuccessInModal(`Successfully deleted ${data.deletedCount || 0} users! All deleted users must create new accounts.`);
                await this.loadAllUsersInModal();
            } else {
                throw new Error(data.error || 'Failed to delete users');
            }
        } catch (error) {
            console.error('Delete all users error:', error);
            this.showErrorInModal(error.message || 'Failed to delete users');
        }
    },

    /**
     * Show error message in modal
     */
    showErrorInModal(message) {
        const errorDiv = document.getElementById('adminErrorMessage');
        const successDiv = document.getElementById('adminSuccessMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'flex';
        }
        if (successDiv) {
            successDiv.style.display = 'none';
        }
        setTimeout(() => {
            if (errorDiv) errorDiv.style.display = 'none';
        }, 5000);
    },

    /**
     * Show success message in modal
     */
    showSuccessInModal(message) {
        const successDiv = document.getElementById('adminSuccessMessage');
        const errorDiv = document.getElementById('adminErrorMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'flex';
        }
        if (errorDiv) {
            errorDiv.style.display = 'none';
        }
        setTimeout(() => {
            if (successDiv) successDiv.style.display = 'none';
        }, 3000);
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

// Make AdminController accessible globally
window.AdminController = AdminController;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminController;
}

