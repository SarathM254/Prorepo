/**
 * Admin Panel Initialization Script
 * Handles sidebar navigation, section switching, and overall admin panel setup
 */

const AdminPanel = {
    currentSection: 'dashboard',

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

        // Setup sidebar navigation
        this.setupSidebarNavigation();

        // Setup sidebar toggle for mobile
        this.setupSidebarToggle();

        // Load initial section
        await this.switchSection('dashboard');

        // Initialize article controller if articles section exists
        if (document.getElementById('articlesSection')) {
            if (typeof AdminArticleController !== 'undefined') {
                await AdminArticleController.init();
            }
        }

        // Load user info
        await this.loadUserInfo();
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
     * Setup sidebar navigation
     */
    setupSidebarNavigation() {
        const navItems = document.querySelectorAll('.nav-item[data-section]');
        navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.dataset.section;
                this.switchSection(section);
                
                // Close sidebar on mobile after selection
                if (window.innerWidth <= 1024) {
                    const sidebar = document.getElementById('adminSidebar');
                    if (sidebar) {
                        sidebar.classList.remove('open');
                    }
                }
            });
        });
    },

    /**
     * Setup sidebar toggle for mobile
     */
    setupSidebarToggle() {
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('adminSidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('open');
            });
        }

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (sidebar && !sidebar.contains(e.target) && !sidebarToggle.contains(e.target)) {
                    sidebar.classList.remove('open');
                }
            }
        });
    },

    /**
     * Switch between admin sections
     */
    async switchSection(sectionName) {
        // Update active nav item
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            item.classList.remove('active');
            if (item.dataset.section === sectionName) {
                item.classList.add('active');
            }
        });

        // Update active section
        const sections = document.querySelectorAll('.admin-section');
        sections.forEach(section => {
            section.classList.remove('active');
        });

        const targetSection = document.getElementById(`${sectionName}Section`);
        if (targetSection) {
            targetSection.classList.add('active');
        }

        // Update page title
        const pageTitle = document.getElementById('pageTitle');
        if (pageTitle) {
            const titles = {
                dashboard: 'Dashboard',
                articles: 'Articles Management',
                users: 'Users Management',
                settings: 'Settings'
            };
            pageTitle.textContent = titles[sectionName] || 'Admin Panel';
        }

        this.currentSection = sectionName;

        // Load section-specific data
        switch (sectionName) {
            case 'dashboard':
                if (typeof AdminController !== 'undefined' && AdminController.updateDashboard) {
                    await AdminController.updateDashboard();
                }
                break;
            case 'articles':
                if (typeof AdminArticleController !== 'undefined') {
                    await AdminArticleController.loadAllArticles();
                }
                break;
            case 'users':
                if (typeof AdminController !== 'undefined' && AdminController.loadAllUsers) {
                    await AdminController.loadAllUsers();
                }
                break;
        }
    },

    /**
     * Load user info
     */
    async loadUserInfo() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) return;

        try {
            const response = await fetch('/api/auth/status', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            const data = await response.json();

            if (data.authenticated && data.user) {
                const adminUserName = document.getElementById('adminUserName');
                if (adminUserName) {
                    adminUserName.textContent = data.user.name || 'Super Admin';
                }
            }
        } catch (error) {
            console.error('Load user info error:', error);
        }
    },

    /**
     * Show error message
     */
    showError(message) {
        const errorDiv = document.getElementById('errorMessage');
        if (errorDiv) {
            errorDiv.textContent = message;
            errorDiv.style.display = 'flex';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 5000);
        } else {
            alert('Error: ' + message);
        }
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        const successDiv = document.getElementById('successMessage');
        if (successDiv) {
            successDiv.textContent = message;
            successDiv.style.display = 'flex';
            setTimeout(() => {
                successDiv.style.display = 'none';
            }, 3000);
        } else {
            alert('Success: ' + message);
        }
    }
};

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => AdminPanel.init());
} else {
    AdminPanel.init();
}





