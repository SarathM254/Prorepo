/**
 * AdminArticleController - Article Management Controller
 * Handles all article management functionality for admin panel
 */

const AdminArticleController = {
    currentPage: 1,
    pageSize: 20,
    totalPages: 1,
    totalArticles: 0,
    selectedArticles: new Set(),
    currentFilters: {
        search: '',
        tag: '',
        status: ''
    },
    currentArticleId: null,

    /**
     * Initialize article management
     */
    async init() {
        this.setupEventListeners();
        await this.loadAllArticles();
    },

    /**
     * Setup event listeners
     */
    setupEventListeners() {
        // Search input
        const searchInput = document.getElementById('articleSearch');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value;
                    this.currentPage = 1;
                    this.loadAllArticles();
                }, 500);
            });
        }

        // Category filter
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.tag = e.target.value;
                this.currentPage = 1;
                this.loadAllArticles();
            });
        }

        // Status filter
        const statusFilter = document.getElementById('statusFilter');
        if (statusFilter) {
            statusFilter.addEventListener('change', (e) => {
                this.currentFilters.status = e.target.value;
                this.currentPage = 1;
                this.loadAllArticles();
            });
        }

        // Select all checkbox
        const selectAll = document.getElementById('selectAllArticles');
        if (selectAll) {
            selectAll.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.selectAllArticles();
                } else {
                    this.deselectAllArticles();
                }
            });
        }

        // Bulk delete button
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.addEventListener('click', () => {
                this.bulkDeleteArticles();
            });
        }

        // Close modal buttons
        const closeEditModal = document.getElementById('closeEditModal');
        if (closeEditModal) {
            closeEditModal.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        const cancelEditArticle = document.getElementById('cancelEditArticle');
        if (cancelEditArticle) {
            cancelEditArticle.addEventListener('click', () => {
                this.closeEditModal();
            });
        }

        // Edit article form
        const editArticleForm = document.getElementById('editArticleForm');
        if (editArticleForm) {
            editArticleForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveArticle();
            });
        }

        // Image input change
        const editArticleImage = document.getElementById('editArticleImage');
        if (editArticleImage) {
            editArticleImage.addEventListener('change', (e) => {
                this.handleImageChange(e);
            });
        }

        // Remove image button
        const removeArticleImage = document.getElementById('removeArticleImage');
        if (removeArticleImage) {
            removeArticleImage.addEventListener('click', () => {
                this.removeImage();
            });
        }

        // Close modal when clicking outside
        const modal = document.getElementById('articleEditModal');
        if (modal) {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeEditModal();
                }
            });
        }
    },

    /**
     * Load all articles from API
     */
    async loadAllArticles() {
        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;

        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <div class="loading">
                        <i class="fas fa-spinner fa-spin"></i> Loading articles...
                    </div>
                </td>
            </tr>
        `;

        const authToken = localStorage.getItem('authToken');
        
        // Build query string
        const params = new URLSearchParams({
            page: this.currentPage,
            limit: this.pageSize
        });
        
        if (this.currentFilters.search) {
            params.append('search', this.currentFilters.search);
        }
        
        if (this.currentFilters.tag) {
            params.append('tag', this.currentFilters.tag);
        }
        
        if (this.currentFilters.status) {
            params.append('status', this.currentFilters.status);
        }

        try {
            const response = await fetch(`/api/admin/articles?${params.toString()}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                if (response.status === 403 || response.status === 401) {
                    throw new Error('Super admin access required');
                }
                throw new Error('Failed to load articles');
            }

            const data = await response.json();

            if (data.success && data.articles) {
                this.totalArticles = data.pagination?.total || data.articles.length;
                this.totalPages = data.pagination?.pages || 1;
                this.renderArticlesList(data.articles);
                this.renderPagination();
                this.updateBadges();
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Load articles error:', error);
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="error-message">
                            <i class="fas fa-exclamation-circle"></i> ${error.message}
                        </div>
                    </td>
                </tr>
            `;
        }
    },

    /**
     * Render articles list in table
     */
    renderArticlesList(articles) {
        const tbody = document.getElementById('articlesTableBody');
        if (!tbody) return;

        if (articles.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <p class="text-muted">No articles found.</p>
                    </td>
                </tr>
            `;
            return;
        }

        let tableHTML = '';

        articles.forEach(article => {
            const createdDate = article.created_at 
                ? new Date(article.created_at).toLocaleDateString() 
                : 'N/A';
            
            const statusBadge = article.status === 'approved' 
                ? '<span class="status-badge approved">Approved</span>'
                : '<span class="status-badge pending">Pending</span>';

            const imageUrl = article.image_path || '/uploads/placeholder.jpg';
            const imagePreview = `<img src="${imageUrl}" alt="${this.escapeHtml(article.title)}" onerror="this.src='/uploads/placeholder.jpg'">`;

            tableHTML += `
                <tr>
                    <td>
                        <input type="checkbox" class="article-checkbox" data-article-id="${article.id}" 
                               ${this.selectedArticles.has(article.id) ? 'checked' : ''}>
                    </td>
                    <td>${imagePreview}</td>
                    <td>
                        <strong>${this.escapeHtml(article.title)}</strong>
                    </td>
                    <td>${this.escapeHtml(article.author_name || 'Unknown')}</td>
                    <td><span class="tag-badge">${this.escapeHtml(article.tag)}</span></td>
                    <td>${statusBadge}</td>
                    <td>${createdDate}</td>
                    <td>
                        <div class="action-buttons">
                            <button class="action-btn view" onclick="AdminArticleController.viewArticle('${article.id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="action-btn edit" onclick="AdminArticleController.editArticle('${article.id}')" title="Edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="action-btn delete" onclick="AdminArticleController.deleteArticle('${article.id}')" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = tableHTML;

        // Add event listeners to checkboxes
        const checkboxes = tbody.querySelectorAll('.article-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const articleId = e.target.dataset.articleId;
                if (e.target.checked) {
                    this.selectedArticles.add(articleId);
                } else {
                    this.selectedArticles.delete(articleId);
                }
                this.updateBulkActions();
                this.updateSelectAllCheckbox();
            });
        });
    },

    /**
     * Render pagination controls
     */
    renderPagination() {
        const pagination = document.getElementById('articlesPagination');
        if (!pagination) return;

        if (this.totalPages <= 1) {
            pagination.innerHTML = '';
            return;
        }

        let paginationHTML = '';

        // Previous button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === 1 ? 'disabled' : ''} 
                    onclick="AdminArticleController.goToPage(${this.currentPage - 1})">
                <i class="fas fa-chevron-left"></i> Previous
            </button>
        `;

        // Page numbers
        const maxPages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(maxPages / 2));
        let endPage = Math.min(this.totalPages, startPage + maxPages - 1);

        if (endPage - startPage < maxPages - 1) {
            startPage = Math.max(1, endPage - maxPages + 1);
        }

        if (startPage > 1) {
            paginationHTML += `
                <button class="page-number" onclick="AdminArticleController.goToPage(1)">1</button>
            `;
            if (startPage > 2) {
                paginationHTML += `<span class="text-muted">...</span>`;
            }
        }

        for (let i = startPage; i <= endPage; i++) {
            paginationHTML += `
                <button class="page-number ${i === this.currentPage ? 'active' : ''}" 
                        onclick="AdminArticleController.goToPage(${i})">${i}</button>
            `;
        }

        if (endPage < this.totalPages) {
            if (endPage < this.totalPages - 1) {
                paginationHTML += `<span class="text-muted">...</span>`;
            }
            paginationHTML += `
                <button class="page-number" onclick="AdminArticleController.goToPage(${this.totalPages})">${this.totalPages}</button>
            `;
        }

        // Next button
        paginationHTML += `
            <button class="pagination-btn" ${this.currentPage === this.totalPages ? 'disabled' : ''} 
                    onclick="AdminArticleController.goToPage(${this.currentPage + 1})">
                Next <i class="fas fa-chevron-right"></i>
            </button>
        `;

        paginationHTML += `
            <span class="text-muted" style="margin-left: 1rem;">
                Page ${this.currentPage} of ${this.totalPages} (${this.totalArticles} total)
            </span>
        `;

        pagination.innerHTML = paginationHTML;
    },

    /**
     * Go to specific page
     */
    goToPage(page) {
        if (page < 1 || page > this.totalPages || page === this.currentPage) {
            return;
        }
        this.currentPage = page;
        this.loadAllArticles();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },


    /**
     * View article (open in new tab)
     */
    viewArticle(articleId) {
        window.open(`/index.html#article-${articleId}`, '_blank');
    },

    /**
     * Edit article - load article data and open modal
     */
    async editArticle(articleId) {
        this.currentArticleId = articleId;
        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`/api/admin/articles?articleId=${articleId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (!response.ok) {
                throw new Error('Failed to load article');
            }

            const data = await response.json();

            if (data.success && data.article) {
                const article = data.article;
                
                // Populate form
                document.getElementById('editArticleTitle').value = article.title || '';
                document.getElementById('editArticleBody').value = article.body || '';
                document.getElementById('editArticleTag').value = article.tag || 'Campus';
                document.getElementById('editArticleStatus').value = article.status || 'approved';

                // Set image preview
                const imagePreview = document.getElementById('editArticleImagePreview');
                const removeImageBtn = document.getElementById('removeArticleImage');
                
                if (article.image_path) {
                    imagePreview.src = article.image_path;
                    imagePreview.style.display = 'block';
                    removeImageBtn.style.display = 'block';
                } else {
                    imagePreview.style.display = 'none';
                    removeImageBtn.style.display = 'none';
                }

                // Open modal
                this.openEditModal();
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Load article error:', error);
            this.showError(error.message || 'Failed to load article');
        }
    },

    /**
     * Save article changes
     */
    async saveArticle() {
        if (!this.currentArticleId) {
            this.showError('No article selected');
            return;
        }

        const title = document.getElementById('editArticleTitle').value.trim();
        const body = document.getElementById('editArticleBody').value.trim();
        const tag = document.getElementById('editArticleTag').value;
        const status = document.getElementById('editArticleStatus').value;

        if (!title || !body || !tag) {
            this.showError('Please fill in all required fields');
            return;
        }

        const authToken = localStorage.getItem('authToken');
        const imageInput = document.getElementById('editArticleImage');
        let imageData = null;

        // Check if new image is selected
        if (imageInput.files && imageInput.files[0]) {
            imageData = await this.convertImageToBase64(imageInput.files[0]);
        }

        const updateData = {
            title,
            body,
            tag,
            status
        };

        if (imageData) {
            updateData.imageData = imageData;
        }

        try {
            const response = await fetch(`/api/admin/articles?articleId=${this.currentArticleId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify(updateData)
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess('Article updated successfully!');
                this.closeEditModal();
                await this.loadAllArticles();
                
                // Update dashboard if active
                if (typeof AdminController !== 'undefined' && AdminController.updateDashboard) {
                    AdminController.updateDashboard();
                }
            } else {
                throw new Error(data.error || 'Failed to update article');
            }
        } catch (error) {
            console.error('Save article error:', error);
            this.showError(error.message || 'Failed to update article');
        }
    },

    /**
     * Delete article
     */
    async deleteArticle(articleId) {
        if (!confirm('Are you sure you want to delete this article? This action cannot be undone.')) {
            return;
        }

        const authToken = localStorage.getItem('authToken');

        try {
            const response = await fetch(`/api/admin/articles?articleId=${articleId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess('Article deleted successfully!');
                await this.loadAllArticles();
                
                // Update dashboard if active
                if (typeof AdminController !== 'undefined' && AdminController.updateDashboard) {
                    AdminController.updateDashboard();
                }
            } else {
                throw new Error(data.error || 'Failed to delete article');
            }
        } catch (error) {
            console.error('Delete article error:', error);
            this.showError(error.message || 'Failed to delete article');
        }
    },

    /**
     * Bulk delete articles
     */
    async bulkDeleteArticles() {
        if (this.selectedArticles.size === 0) {
            this.showError('Please select at least one article to delete');
            return;
        }

        const count = this.selectedArticles.size;
        if (!confirm(`Are you sure you want to delete ${count} article(s)? This action cannot be undone.`)) {
            return;
        }

        const authToken = localStorage.getItem('authToken');
        const articleIds = Array.from(this.selectedArticles).join(',');

        try {
            const response = await fetch(`/api/admin/articles?articleIds=${articleIds}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.showSuccess(`Successfully deleted ${data.deletedCount || count} article(s)!`);
                this.selectedArticles.clear();
                this.updateBulkActions();
                await this.loadAllArticles();
                
                // Update dashboard if active
                if (typeof AdminController !== 'undefined' && AdminController.updateDashboard) {
                    AdminController.updateDashboard();
                }
            } else {
                throw new Error(data.error || 'Failed to delete articles');
            }
        } catch (error) {
            console.error('Bulk delete error:', error);
            this.showError(error.message || 'Failed to delete articles');
        }
    },

    /**
     * Select all articles
     */
    selectAllArticles() {
        const checkboxes = document.querySelectorAll('.article-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
            this.selectedArticles.add(checkbox.dataset.articleId);
        });
        this.updateBulkActions();
    },

    /**
     * Deselect all articles
     */
    deselectAllArticles() {
        const checkboxes = document.querySelectorAll('.article-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
            this.selectedArticles.delete(checkbox.dataset.articleId);
        });
        this.selectedArticles.clear();
        this.updateBulkActions();
    },

    /**
     * Update select all checkbox state
     */
    updateSelectAllCheckbox() {
        const selectAll = document.getElementById('selectAllArticles');
        if (!selectAll) return;

        const checkboxes = document.querySelectorAll('.article-checkbox');
        const checkedCount = Array.from(checkboxes).filter(cb => cb.checked).length;
        
        selectAll.checked = checkboxes.length > 0 && checkedCount === checkboxes.length;
        selectAll.indeterminate = checkedCount > 0 && checkedCount < checkboxes.length;
    },

    /**
     * Update bulk actions visibility
     */
    updateBulkActions() {
        const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
        if (bulkDeleteBtn) {
            bulkDeleteBtn.style.display = this.selectedArticles.size > 0 ? 'inline-flex' : 'none';
        }
    },

    /**
     * Open edit modal
     */
    openEditModal() {
        const modal = document.getElementById('articleEditModal');
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    /**
     * Close edit modal
     */
    closeEditModal() {
        const modal = document.getElementById('articleEditModal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentArticleId = null;
        
        // Reset form
        const form = document.getElementById('editArticleForm');
        if (form) {
            form.reset();
        }
        
        const imagePreview = document.getElementById('editArticleImagePreview');
        const removeImageBtn = document.getElementById('removeArticleImage');
        if (imagePreview) imagePreview.style.display = 'none';
        if (removeImageBtn) removeImageBtn.style.display = 'none';
    },

    /**
     * Handle image change
     */
    handleImageChange(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const imagePreview = document.getElementById('editArticleImagePreview');
            const removeImageBtn = document.getElementById('removeArticleImage');
            
            if (imagePreview) {
                imagePreview.src = e.target.result;
                imagePreview.style.display = 'block';
            }
            if (removeImageBtn) {
                removeImageBtn.style.display = 'block';
            }
        };
        reader.readAsDataURL(file);
    },

    /**
     * Remove image
     */
    removeImage() {
        const imageInput = document.getElementById('editArticleImage');
        const imagePreview = document.getElementById('editArticleImagePreview');
        const removeImageBtn = document.getElementById('removeArticleImage');
        
        if (imageInput) imageInput.value = '';
        if (imagePreview) {
            imagePreview.src = '';
            imagePreview.style.display = 'none';
        }
        if (removeImageBtn) removeImageBtn.style.display = 'none';
    },

    /**
     * Convert image file to base64
     */
    convertImageToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = (e) => reject(e);
            reader.readAsDataURL(file);
        });
    },

    /**
     * Update badges in navigation
     */
    updateBadges() {
        // This will be called from AdminController after loading dashboard stats
    },

    /**
     * Show error message
     */
    showError(message) {
        if (typeof AdminController !== 'undefined' && AdminController.showError) {
            AdminController.showError(message);
        } else {
            alert('Error: ' + message);
        }
    },

    /**
     * Show success message
     */
    showSuccess(message) {
        if (typeof AdminController !== 'undefined' && AdminController.showSuccess) {
            AdminController.showSuccess(message);
        } else {
            alert('Success: ' + message);
        }
    },

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        if (typeof Helpers !== 'undefined' && Helpers.escapeHtml) {
            return Helpers.escapeHtml(text);
        }
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};

// Make AdminArticleController accessible globally for onclick handlers
window.AdminArticleController = AdminArticleController;

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AdminArticleController;
}

