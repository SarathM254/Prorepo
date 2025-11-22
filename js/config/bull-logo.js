/**
 * Bull Logo Configuration
 * Cloudinary URL for the bull logo used for super admin users
 * URL includes transformations for optimal sizing:
 * - w_200,h_200: Max dimensions for navigation (scaled down)
 * - c_limit: Maintain aspect ratio
 * - q_auto: Automatic quality optimization
 */

const BULL_LOGO_URL = 'https://res.cloudinary.com/dflmlabms/image/upload/w_200,h_200,c_limit,q_auto/v1763848611/Bull_op7xul.png';

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.BULL_LOGO_URL = BULL_LOGO_URL;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BULL_LOGO_URL };
}

