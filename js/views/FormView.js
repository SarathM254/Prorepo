/**
 * FormView - Article Submission Form
 * Handles rendering and management of the article submission form
 * SIMPLE IMAGE ADJUSTMENT: Upload, zoom, and drag with grid overlay
 */
const FormView = {
    currentImageFile: null,
    imageTransform: {
        scale: 1,
        translateX: 0,
        translateY: 0
    },
    isDragging: false,
    dragStart: { x: 0, y: 0 },
    
    elements: {
        articleFormModal: null,
        addArticleBtn: null,
        closeArticleForm: null,
        cancelArticle: null,
        articleForm: null,
        fileUploadArea: null,
        articleImage: null,
        imageAdjustmentArea: null,
        adjustableImage: null,
        imageContainer: null,
        imageZoomSlider: null,
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
        this.elements.imageAdjustmentArea = document.getElementById('imageAdjustmentArea');
        this.elements.adjustableImage = document.getElementById('adjustableImage');
        this.elements.imageContainer = document.querySelector('.image-container-with-grid');
        this.elements.imageZoomSlider = document.getElementById('imageZoomSlider');
        this.elements.removeImage = document.getElementById('removeImage');
        this.elements.titleInput = document.getElementById('articleTitle');
        this.elements.bodyInput = document.getElementById('articleBody');
        this.elements.titleCount = document.getElementById('titleCount');
        this.elements.bodyCount = document.getElementById('bodyCount');
        this.elements.submitArticleBtn = document.getElementById('submitArticle');
        
        // Setup image adjustment controls
        this.setupImageAdjustment();
    },

    /**
     * Setup image adjustment controls (zoom and drag)
     */
    setupImageAdjustment() {
        if (!this.elements.imageContainer || !this.elements.adjustableImage || !this.elements.imageZoomSlider) return;
        
        // Zoom slider
        this.elements.imageZoomSlider.addEventListener('input', (e) => {
            this.imageTransform.scale = parseFloat(e.target.value) / 100;
            this.applyImageTransform();
        });
        
        // Mouse drag for desktop
        this.elements.imageContainer.addEventListener('mousedown', (e) => {
            e.preventDefault();
            this.isDragging = true;
            this.dragStart.x = e.clientX - this.imageTransform.translateX;
            this.dragStart.y = e.clientY - this.imageTransform.translateY;
            this.elements.imageContainer.classList.add('dragging');
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!this.isDragging) return;
            e.preventDefault();
            this.imageTransform.translateX = e.clientX - this.dragStart.x;
            this.imageTransform.translateY = e.clientY - this.dragStart.y;
            this.applyImageTransform();
        });
        
        document.addEventListener('mouseup', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.elements.imageContainer.classList.remove('dragging');
            }
        });
        
        // Touch drag for mobile
        let touchStartX = 0;
        let touchStartY = 0;
        let touchTranslateX = 0;
        let touchTranslateY = 0;
        
        this.elements.imageContainer.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                e.preventDefault();
                this.isDragging = true;
                touchStartX = e.touches[0].clientX;
                touchStartY = e.touches[0].clientY;
                touchTranslateX = this.imageTransform.translateX;
                touchTranslateY = this.imageTransform.translateY;
                this.elements.imageContainer.classList.add('dragging');
            }
        }, { passive: false });
        
        this.elements.imageContainer.addEventListener('touchmove', (e) => {
            if (!this.isDragging || e.touches.length !== 1) return;
            e.preventDefault();
            const deltaX = e.touches[0].clientX - touchStartX;
            const deltaY = e.touches[0].clientY - touchStartY;
            this.imageTransform.translateX = touchTranslateX + deltaX;
            this.imageTransform.translateY = touchTranslateY + deltaY;
            this.applyImageTransform();
        }, { passive: false });
        
        this.elements.imageContainer.addEventListener('touchend', () => {
            if (this.isDragging) {
                this.isDragging = false;
                this.elements.imageContainer.classList.remove('dragging');
            }
        });
    },

    /**
     * Calculate minimum scale to cover container
     */
    calculateMinScale() {
        if (!this.elements.imageContainer || !this.elements.adjustableImage) return 1;
        
        const container = this.elements.imageContainer;
        const img = this.elements.adjustableImage;
        
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        
        if (!imgWidth || !imgHeight || !containerWidth || !containerHeight) return 1;
        
        // Calculate scale to cover (like object-fit: cover)
        const scaleX = containerWidth / imgWidth;
        const scaleY = containerHeight / imgHeight;
        
        // Use the larger scale to ensure full coverage
        return Math.max(scaleX, scaleY);
    },

    /**
     * Apply current transform to image with boundary constraints
     */
    applyImageTransform() {
        if (!this.elements.adjustableImage || !this.elements.imageContainer) return;
        
        let { scale } = this.imageTransform;
        
        // Ensure minimum scale to cover container
        const minScale = this.calculateMinScale();
        if (scale < minScale) {
            scale = minScale;
            this.imageTransform.scale = scale;
            if (this.elements.imageZoomSlider) {
                this.elements.imageZoomSlider.value = Math.round(scale * 100);
            }
        }
        
        // Apply boundary constraints
        const constrained = this.constrainToBoundaries(
            this.imageTransform.translateX,
            this.imageTransform.translateY,
            scale
        );
        
        // Update the actual values with constrained ones
        this.imageTransform.translateX = constrained.x;
        this.imageTransform.translateY = constrained.y;
        
        // Apply transform: translate to center, then scale, then apply user translation
        this.elements.adjustableImage.style.transform = 
            `translate(-50%, -50%) scale(${scale}) translate(${constrained.x / scale}px, ${constrained.y / scale}px)`;
    },

    /**
     * Constrain image position to prevent black borders
     * @param {number} x - Desired X translation
     * @param {number} y - Desired Y translation
     * @param {number} scale - Current scale
     * @returns {object} Constrained {x, y}
     */
    constrainToBoundaries(x, y, scale) {
        if (!this.elements.imageContainer || !this.elements.adjustableImage) {
            return { x, y };
        }
        
        const container = this.elements.imageContainer;
        const img = this.elements.adjustableImage;
        
        // Get container dimensions
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;
        
        // Get natural image dimensions
        const imgWidth = img.naturalWidth || img.width;
        const imgHeight = img.naturalHeight || img.height;
        
        if (!imgWidth || !imgHeight) return { x, y };
        
        // Calculate scaled image dimensions
        const scaledWidth = imgWidth * scale;
        const scaledHeight = imgHeight * scale;
        
        // Calculate maximum allowed translation
        // The image edges should not go inside the container
        let maxX = 0;
        let minX = 0;
        let maxY = 0;
        let minY = 0;
        
        if (scaledWidth > containerWidth) {
            // Image is wider than container - allow horizontal panning
            const overflow = (scaledWidth - containerWidth) / 2;
            maxX = overflow;
            minX = -overflow;
        }
        // If image is narrower or equal, keep centered (maxX = minX = 0)
        
        if (scaledHeight > containerHeight) {
            // Image is taller than container - allow vertical panning
            const overflow = (scaledHeight - containerHeight) / 2;
            maxY = overflow;
            minY = -overflow;
        }
        // If image is shorter or equal, keep centered (maxY = minY = 0)
        
        // Constrain the values
        const constrainedX = Math.max(minX, Math.min(maxX, x));
        const constrainedY = Math.max(minY, Math.min(maxY, y));
        
        return { x: constrainedX, y: constrainedY };
    },

    /**
     * Reset transform
     */
    resetImageTransform() {
        this.imageTransform = {
            scale: 1,
            translateX: 0,
            translateY: 0
        };
        if (this.elements.imageZoomSlider) {
            this.elements.imageZoomSlider.value = 100;
        }
        this.applyImageTransform();
    },

    /**
     * Resets the article submission form
     */
    resetArticleForm() {
        this.elements.articleForm.reset();
        this.elements.titleCount.textContent = '0/100';
        this.elements.bodyCount.textContent = '0/450';
        this.elements.imageAdjustmentArea.style.display = 'none';
        this.elements.fileUploadArea.style.display = 'block';
        this.elements.articleImage.value = '';
        this.elements.submitArticleBtn.disabled = false;
        this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Article';
        
        this.currentImageFile = null;
        this.resetImageTransform();
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
     * Handles image selection
     * @param {File} file
     */
    handleImageSelection(file) {
        if (file && file.type.startsWith('image/')) {
            if (file.size > 5 * 1024 * 1024) {
                alert('File size must be less than 5MB');
                return false;
            }
            
            this.currentImageFile = file;
            this.resetImageTransform();
            
            // Show image in adjustment area
            const reader = new FileReader();
            reader.onload = (e) => {
                this.elements.adjustableImage.src = e.target.result;
                this.elements.fileUploadArea.style.display = 'none';
                this.elements.imageAdjustmentArea.style.display = 'block';
                
                // Wait for image to load, then set initial scale and apply constraints
                this.elements.adjustableImage.onload = () => {
                    // Set initial scale to cover the container
                    const minScale = this.calculateMinScale();
                    this.imageTransform.scale = minScale;
                    
                    // Update slider to reflect initial scale
                    if (this.elements.imageZoomSlider) {
                        const sliderValue = Math.round(minScale * 100);
                        this.elements.imageZoomSlider.min = sliderValue;
                        this.elements.imageZoomSlider.value = sliderValue;
                    }
                    
                    this.applyImageTransform();
                };
            };
            reader.readAsDataURL(file);
            
            return true;
        } else {
            alert('Please select a valid image file');
            return false;
        }
    },

    /**
     * Removes the selected image
     */
    removeSelectedImage() {
        this.elements.imageAdjustmentArea.style.display = 'none';
        this.elements.fileUploadArea.style.display = 'block';
        this.elements.articleImage.value = '';
        this.currentImageFile = null;
        this.resetImageTransform();
    },

    /**
     * Get the adjusted image as a blob
     */
    async getAdjustedImageBlob() {
        if (!this.currentImageFile || !this.elements.adjustableImage) return null;
        
        try {
            // Create a canvas to capture the adjusted image
            const container = this.elements.imageContainer;
            const img = this.elements.adjustableImage;
            
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Set canvas size to match container (15:11 aspect ratio - width:height = 3:2.2)
            const outputWidth = 1500;
            const outputHeight = 1100;
            canvas.width = outputWidth;
            canvas.height = outputHeight;
            
            // Fill with black background (shouldn't be visible if boundaries work correctly)
            ctx.fillStyle = '#000000';
            ctx.fillRect(0, 0, outputWidth, outputHeight);
            
            // Load image
            const image = new Image();
            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = this.elements.adjustableImage.src;
            });
            
            // Get container dimensions
            const containerWidth = container.clientWidth;
            const containerHeight = container.clientHeight;
            
            // Calculate scale factor from container to output
            const outputScale = outputWidth / containerWidth;
            
            // Calculate scaled image dimensions in output
            const scaledImageWidth = image.naturalWidth * this.imageTransform.scale * outputScale;
            const scaledImageHeight = image.naturalHeight * this.imageTransform.scale * outputScale;
            
            // Calculate position in output
            const translateX = this.imageTransform.translateX * outputScale;
            const translateY = this.imageTransform.translateY * outputScale;
            
            // Calculate final position (centered + user translation)
            const finalX = (outputWidth / 2) - (scaledImageWidth / 2) + translateX;
            const finalY = (outputHeight / 2) - (scaledImageHeight / 2) + translateY;
            
            // Draw the image
            ctx.drawImage(
                image,
                finalX,
                finalY,
                scaledImageWidth,
                scaledImageHeight
            );
            
            // Convert to blob
            return new Promise((resolve) => {
                canvas.toBlob((blob) => {
                    resolve(blob);
                }, 'image/jpeg', 0.92);
            });
        } catch (error) {
            console.error('Error creating adjusted image:', error);
            return null;
        }
    },

    /**
     * Updates character count
     */
    updateCharCount(inputElement, countElement, maxLength) {
        countElement.textContent = `${inputElement.value.length}/${maxLength}`;
    },

    /**
     * Updates submit button state
     */
    setSubmitting(isSubmitting) {
        this.elements.submitArticleBtn.disabled = isSubmitting;
        if (isSubmitting) {
            this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting...';
        } else {
            this.elements.submitArticleBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Article';
        }
    },

    /**
     * Gets the current image file
     */
    getCurrentImageFile() {
        return this.currentImageFile;
    }
};

// Export
if (typeof module !== 'undefined' && module.exports) {
    module.exports = FormView;
}
