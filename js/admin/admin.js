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
            if (usersStatCard) usersStatCard.style.display = 'none';
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
                    this.closeSidebar();
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
                this.toggleSidebar();
            });
        }

        // Create backdrop overlay
        this.createBackdropOverlay();

        // Close sidebar when clicking outside on mobile
        document.addEventListener('click', (e) => {
            if (window.innerWidth <= 1024) {
                if (sidebar && !sidebar.contains(e.target) && 
                    sidebarToggle && !sidebarToggle.contains(e.target) &&
                    !e.target.closest('.sidebar-backdrop')) {
                    this.closeSidebar();
                }
            }
        });

        // Close sidebar on window resize if switching to desktop
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (window.innerWidth > 1024) {
                    this.closeSidebar();
                }
            }, 250);
        });
    },

    /**
     * Create backdrop overlay for mobile sidebar
     */
    createBackdropOverlay() {
        // Check if backdrop already exists
        if (document.querySelector('.sidebar-backdrop')) {
            return;
        }

        const backdrop = document.createElement('div');
        backdrop.className = 'sidebar-backdrop';
        backdrop.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            z-index: 999;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        `;
        
        backdrop.addEventListener('click', () => {
            this.closeSidebar();
        });

        document.body.appendChild(backdrop);
    },

    /**
     * Toggle sidebar open/closed
     */
    toggleSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        
        if (sidebar) {
            if (sidebar.classList.contains('open')) {
                this.closeSidebar();
            } else {
                this.openSidebar();
            }
        }
    },

    /**
     * Open sidebar
     */
    openSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        
        if (sidebar) {
            sidebar.classList.add('open');
            document.body.classList.add('sidebar-open');
            
            if (backdrop) {
                backdrop.style.opacity = '1';
                backdrop.style.visibility = 'visible';
            }
        }
    },

    /**
     * Close sidebar
     */
    closeSidebar() {
        const sidebar = document.getElementById('adminSidebar');
        const backdrop = document.querySelector('.sidebar-backdrop');
        
        if (sidebar) {
            sidebar.classList.remove('open');
            document.body.classList.remove('sidebar-open');
            
            if (backdrop) {
                backdrop.style.opacity = '0';
                backdrop.style.visibility = 'hidden';
            }
        }
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





