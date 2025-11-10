/**
 * FormView - Article Submission Form
 * Handles rendering and management of the article submission form
 */
const FormView = {
    elements: {
        articleFormModal: null,
        addArticleBtn: null,
        closeArticleForm: null,
        cancelArticle: null,
        articleForm: null,
        fileUploadArea: null,
        articleImage: null,
        imagePreview: null,
        previewImg: null,
        removeImage: null,
        titleInput: null,
        bodyInput: null,
        titleCount: null,
        bodyCount: null,
        submitArticleBtn: null
    },

    /**
     * Initialize DOM element references
     */
    init() {
        this.elements.articleFormModal = document.getElementById('articleFormModal');
        this.elements.addArticleBtn = document.getElementById('addArticleBtn');
        this.elements.closeArticleForm = document.getElementById('closeArticleForm');
        this.elements.cancelArticle = document.getElementById('cancelArticle');
        this.elements.articleForm = document.getElementById('articleForm');
        this.elements.fileUploadArea = document.getElementById('fileUploadArea');
        this.elements.articleImage = document.getElementById('articleImage');
        this.elements.imagePreview = document.getElementById('imagePreview');
        this.elements.previewImg = document.getElementById('previewImg');
        this.elements.removeImage = document.getElementById('removeImage');
        this.elements.titleInput = document.getElementById('articleTitle');
        this.elements.bodyInput = document.getElementById('articleBody');
        this.elements.titleCount = document.getElementById('titleCount');
        this.elements.bodyCount = document.getElementById('bodyCount');
        this.elements.submitArticleBtn = document.getElementById('submitArticle');
    },

    /**
     * Resets the article submission form
     */
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

    /**
     * Opens the article submission modal
     */
    openArticleFormModal() {
        this.elements.articleFormModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Closes the article submission modal
     */
    closeArticleFormModal() {
        this.elements.articleFormModal.classList.remove('active');
        document.body.style.overflow = '';
        this.resetArticleForm();
    },

    /**
     * Updates character count for form inputs
     * @param {HTMLElement} inputElement - Input element
     * @param {HTMLElement} countElement - Count display element
     * @param {number} maxLength - Maximum length
     */
    updateCharCount(inputElement, countElement, maxLength) {
        countElement.textContent = `${inputElement.value.length}/${maxLength}`;
    },

    /**
     * Handles image preview for article submission
     * @param {File} file - Image file
     * @returns {boolean} Whether preview was successful
     */
    handleImagePreview(file) {
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
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
    },

    /**
     * Updates submit button state during submission
     * @param {boolean} isSubmitting - Whether form is being submitted
     */
    setSubmitting(isSubmitting) {
        this.elements.submitArticleBtn.disabled = isSubmitting;
        if (isSubmitting) {
            this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        } else {
            this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Article';
        }
    }
};

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormView;
}

