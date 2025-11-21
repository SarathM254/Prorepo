/**
 * Bull Logo Configuration
 * Replace YOUR_CLOUDINARY_BULL_LOGO_URL_HERE with your actual Cloudinary URL
 * after uploading Bull.png to Cloudinary
 */

const BULL_LOGO_URL = 'YOUR_CLOUDINARY_BULL_LOGO_URL_HERE';

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BULL_LOGO_URL = BULL_LOGO_URL;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BULL_LOGO_URL };
}

