# Feature Implementation Plan - Google Auth & Lighthouse Optimization

## 📋 Overview

This plan covers two major feature implementations:
1. **Google Sign In/Sign Up Synchronization with Password Setup**
2. **Lighthouse Performance Optimization**

**Target**: Improve user experience and website performance  
**Platform**: Vercel (max 12 serverless functions)  
**Constraint**: Article dimensions must remain unchanged

---

## 🎯 Feature 1: Google Sign In/Sign Up with Password Setup

### Current State Analysis

**Current Flow**:
- User clicks "Continue with Google" → Redirects to Google OAuth
- After Google auth → Redirects to `/index.html?token=...`
- If user needs password setup → Shows modal on index.html
- **Problem**: User is redirected away from login page immediately

**Required Flow**:
- User clicks "Continue with Google" → Redirects to Google OAuth
- After Google auth → Check if user needs password setup
- If new user or no password → **Stay on login page** with password setup modal
- If existing user with password → Login normally
- After password setup → User can use either Google or email/password

---

## ✅ Feature 1 Implementation Plan

### Phase 1: Backend Changes

#### 1.1 Update Google OAuth Callback Response

**File**: `api/auth.js`

**Location**: `handleGoogle()` function (around line 275)

**Current Code**:
```javascript
// Redirect to frontend with token
const frontendUrl = process.env.FRONTEND_URL || 'https://proto-social.vercel.app';
const redirectUrl = `${frontendUrl}/index.html?token=${encodeURIComponent(token)}`;
return res.redirect(redirectUrl);
```

**New Code**:
```javascript
// Check if user needs password setup (new user or no password)
const needsPasswordSetup = !user.password || user.password === null;

// Redirect to login page with token and password setup flag
const frontendUrl = process.env.FRONTEND_URL || 'https://proto-social.vercel.app';
let redirectUrl;

if (needsPasswordSetup) {
  // New user or no password - redirect to login page with password setup flag
  redirectUrl = `${frontendUrl}/login.html?token=${encodeURIComponent(token)}&setupPassword=true&isNewUser=${user.created_at && (new Date() - new Date(user.created_at)) < 60000}`;
} else {
  // Existing user with password - redirect to home
  redirectUrl = `${frontendUrl}/index.html?token=${encodeURIComponent(token)}`;
}

return res.redirect(redirectUrl);
```

**Key Changes**:
- Check if user has password
- If no password → redirect to `login.html` with `setupPassword=true`
- If has password → redirect to `index.html` as before

---

#### 1.2 Add Password Setup Endpoint (if needed)

**File**: `api/profile.js` or create `api/auth.js` endpoint

**Note**: Check if `/api/profile` already handles password setup. If yes, reuse it.

**Location**: Add after existing password update logic

**New Endpoint** (if needed):
```javascript
// POST /api/auth/setup-password
// For Google users setting password for first time
```

**Implementation**:
```javascript
// Check if endpoint exists in api/profile.js
// If not, add to api/auth.js:

async function handlePasswordSetup(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const token = extractToken(req.headers.authorization);
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = verifyToken(token);
    if (!decoded) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    const { password } = await parseRequestBody(req);
    
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Connect to database
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');

    // Get user
    const user = await usersCollection.findOne({ email: decoded.email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Hash password
    const bcrypt = require('bcryptjs');
    const hashedPassword = bcrypt.hashSync(password, 10);

    // Update user password
    await usersCollection.updateOne(
      { _id: user._id },
      { $set: { password: hashedPassword } }
    );

    return res.status(200).json({
      success: true,
      message: 'Password set successfully'
    });
  } catch (error) {
    console.error('Password setup error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
```

---

### Phase 2: Frontend Changes - Login Page

#### 2.1 Add Password Setup Modal to Login Page

**File**: `login.html`

**Location**: After error message div (around line 32)

**Add This HTML**:
```html
<!-- Password Setup Modal (for Google users) -->
<div class="password-setup-modal" id="passwordSetupModal" style="display: none;">
    <div class="password-setup-content">
        <!-- Add Info Icon Button -->
        <button class="password-setup-info-btn" id="passwordSetupInfoBtn" aria-label="Why do I need to set a password?">
            <i class="fas fa-info-circle"></i>
        </button>
        
        <div class="password-setup-header">
            <h2><i class="fas fa-lock"></i> Set Your Password</h2>
            <p>To continue, please set a password for your account</p>
        </div>
        <form id="passwordSetupForm">
            <div class="form-group">
                <label for="setupNewPassword">New Password</label>
                <div class="password-input-wrapper">
                    <input type="password" id="setupNewPassword" class="edit-input" placeholder="At least 6 characters" required minlength="6">
                    <button type="button" class="password-toggle" id="setupNewPasswordToggle" aria-label="Toggle password visibility">
                        <i class="fas fa-eye" id="setupNewPasswordToggleIcon"></i>
                    </button>
                </div>
            </div>
            <div class="form-group">
                <label for="setupConfirmPassword">Confirm Password</label>
                <div class="password-input-wrapper">
                    <input type="password" id="setupConfirmPassword" class="edit-input" placeholder="Re-enter new password" required minlength="6">
                    <button type="button" class="password-toggle" id="setupConfirmPasswordToggle" aria-label="Toggle password visibility">
                        <i class="fas fa-eye" id="setupConfirmPasswordToggleIcon"></i>
                    </button>
                </div>
            </div>
            <div class="error-message" id="passwordSetupError" style="display: none;"></div>
            <div class="password-setup-actions">
                <button type="submit" class="save-btn" id="submitPasswordSetupBtn">
                    <i class="fas fa-save"></i> Set Password & Continue
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Info Tooltip for Password Setup -->
<div class="password-setup-info-tooltip" id="passwordSetupInfoTooltip" style="display: none;">
    <div class="info-tooltip-content">
        <button class="close-info-tooltip" id="closeInfoTooltip" aria-label="Close">
            <i class="fas fa-times"></i>
        </button>
        <h3><i class="fas fa-info-circle"></i> Why Set a Password?</h3>
        <p>You signed up using Google. Setting a password allows you to:</p>
        <ul>
            <li>Access your account with email and password</li>
            <li>Use either Google or email/password to login</li>
            <li>Have an additional layer of account security</li>
        </ul>
        <p><strong>This is a one-time setup.</strong> You can continue using Google login after setting a password.</p>
    </div>
</div>
```

---

#### 2.2 Add Password Setup CSS to Login Page

**File**: `login.html`

**Location**: After auth.css link (line 14)

**Add This Line**:
```html
<link rel="stylesheet" href="css/password-setup.css">
```

---

#### 2.3 Update Google OAuth Callback Handler

**File**: `js/auth/login.js`

**Location**: `DOMContentLoaded` event listener (around line 76)

**Current Code**:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');

    if (token) {
        localStorage.setItem('authToken', token);
        window.location.href = '/index.html';
        return;
    }
    
    if (error) {
        showError(decodeURIComponent(error));
    }
    // ... rest of code
});
```

**New Code**:
```javascript
document.addEventListener('DOMContentLoaded', () => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const error = urlParams.get('error');
    const setupPassword = urlParams.get('setupPassword') === 'true';
    const isNewUser = urlParams.get('isNewUser') === 'true';

    if (token) {
        localStorage.setItem('authToken', token);
        
        // Check if password setup is required
        if (setupPassword) {
            // Show password setup modal instead of redirecting
            showPasswordSetupModal();
            // Clean URL - remove query parameters
            window.history.replaceState({}, document.title, '/login.html');
        } else {
            // Existing user with password - redirect to home
            window.location.href = '/index.html';
        }
        return;
    }
    
    if (error) {
        showError(decodeURIComponent(error));
    }
    
    // ... rest of existing code
});
```

---

#### 2.4 Add Password Setup Functions

**File**: `js/auth/login.js`

**Location**: Add at the end of the file (before closing)

**Add These Functions**:
```javascript
/**
 * Shows password setup modal
 */
function showPasswordSetupModal() {
    const modal = document.getElementById('passwordSetupModal');
    if (modal) {
        modal.style.display = 'flex';
        setupPasswordSetupToggles();
    }
}

/**
 * Hides password setup modal
 */
function hidePasswordSetupModal() {
    const modal = document.getElementById('passwordSetupModal');
    if (modal) {
        modal.style.display = 'none';
    }
}

/**
 * Sets up password visibility toggles for password setup form
 */
function setupPasswordSetupToggles() {
    const toggles = [
        { inputId: 'setupNewPassword', toggleId: 'setupNewPasswordToggle', iconId: 'setupNewPasswordToggleIcon' },
        { inputId: 'setupConfirmPassword', toggleId: 'setupConfirmPasswordToggle', iconId: 'setupConfirmPasswordToggleIcon' }
    ];

    toggles.forEach(({ inputId, toggleId, iconId }) => {
        const passwordInput = document.getElementById(inputId);
        const toggleBtn = document.getElementById(toggleId);
        const toggleIcon = document.getElementById(iconId);
        
        if (passwordInput && toggleBtn && toggleIcon) {
            toggleBtn.addEventListener('click', () => {
                const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
                passwordInput.setAttribute('type', type);
                
                if (type === 'text') {
                    toggleIcon.classList.remove('fa-eye');
                    toggleIcon.classList.add('fa-eye-slash');
                } else {
                    toggleIcon.classList.remove('fa-eye-slash');
                    toggleIcon.classList.add('fa-eye');
                }
            });
        }
    });
}

/**
 * Handles password setup form submission
 */
async function handlePasswordSetup(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('setupNewPassword').value;
    const confirmPassword = document.getElementById('setupConfirmPassword').value;
    const errorDiv = document.getElementById('passwordSetupError');
    const submitBtn = document.getElementById('submitPasswordSetupBtn');
    
    // Clear previous errors
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
    
    // Validate passwords
    if (!newPassword || newPassword.length < 6) {
        showPasswordSetupError('Password must be at least 6 characters long');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showPasswordSetupError('Passwords do not match');
        return;
    }
    
    // Disable submit button
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Setting Password...';
    
    try {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            throw new Error('Session expired. Please try logging in again.');
        }
        
        // Check if we need to use profile endpoint or auth endpoint
        const response = await fetch('/api/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                password: newPassword,
                currentPassword: '' // Empty for Google users setting password for first time
            })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Password set successfully - redirect to home
            hidePasswordSetupModal();
            window.location.href = '/index.html';
        } else {
            throw new Error(data.error || 'Failed to set password');
        }
    } catch (error) {
        console.error('Password setup error:', error);
        showPasswordSetupError(error.message || 'Failed to set password. Please try again.');
        submitBtn.disabled = false;
        submitBtn.innerHTML = '<i class="fas fa-save"></i> Set Password & Continue';
    }
}

/**
 * Shows password setup error message
 */
function showPasswordSetupError(message) {
    const errorDiv = document.getElementById('passwordSetupError');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
    }
}

/**
 * Sets up password setup form event listeners
 */
function setupPasswordSetupForm() {
    const form = document.getElementById('passwordSetupForm');
    if (form) {
        form.addEventListener('submit', handlePasswordSetup);
    }
    
    // Info button
    const infoBtn = document.getElementById('passwordSetupInfoBtn');
    const infoTooltip = document.getElementById('passwordSetupInfoTooltip');
    const closeTooltip = document.getElementById('closeInfoTooltip');
    
    if (infoBtn && infoTooltip) {
        infoBtn.addEventListener('click', () => {
            infoTooltip.style.display = 'flex';
        });
    }
    
    if (closeTooltip && infoTooltip) {
        closeTooltip.addEventListener('click', () => {
            infoTooltip.style.display = 'none';
        });
    }
}
```

---

#### 2.5 Initialize Password Setup Form

**File**: `js/auth/login.js`

**Location**: In `DOMContentLoaded` event listener

**Add After Error Handling**:
```javascript
// Setup password setup form
setupPasswordSetupForm();
```

---

### Phase 3: Update Existing Password Setup (Index Page)

**Note**: The password setup modal on index.html should still work for users who somehow skip it on login page.

**File**: `js/controllers/AppController.js`

**Status**: Already exists - no changes needed

---

### Phase 4: Testing Checklist

- [ ] New Google user → Redirects to login.html with password setup modal
- [ ] Existing Google user with password → Redirects to index.html
- [ ] Password setup form validates passwords match
- [ ] Password setup form validates minimum length (6 characters)
- [ ] After password setup → User can login with email/password
- [ ] After password setup → User can still login with Google
- [ ] Error messages display correctly
- [ ] Password visibility toggles work
- [ ] Info tooltip displays correctly

---

## 🎯 Feature 2: Lighthouse Performance Optimization

### Current Lighthouse Issues

1. **Font Display**: 680ms savings potential
   - Issue: Fonts don't have `font-display: swap`
   - Location: Google Fonts link

2. **CSS Loading**: 220ms total from multiple files
   - Issue: Multiple CSS files loaded sequentially
   - Solution: Combine critical CSS or optimize loading

3. **Google Fonts**: 900ms load time
   - Issue: External CDN request
   - Solution: Add `font-display: swap` and optimize

4. **Font Awesome**: 1,130ms load time
   - Issue: Large CSS file from CDN
   - Solution: Load only needed icons or optimize

---

## ✅ Feature 2 Implementation Plan

### Phase 1: Font Display Optimization

#### 1.1 Add Font-Display to Google Fonts

**File**: `index.html` and `login.html`

**Location**: Google Fonts link (around line 8)

**Current Code**:
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

**New Code** (Already has display=swap, but verify):
```html
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
```

**Better Optimization**:
```html
<!-- Preconnect to Google Fonts -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<!-- Load Google Fonts with display=swap -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet" media="print" onload="this.media='all'">
<noscript><link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet"></noscript>
```

**OR Use System Font Stack First** (Better Performance):
```css
/* In base.css - add at top */
@font-face {
  font-family: 'Inter';
  font-display: swap;
  /* ... */
}

/* Or use system fonts as fallback */
body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', sans-serif;
}
```

**Recommended Solution** (Simplest):
Add `font-display: swap` via inline style in base.css:

**File**: `css/base.css`

**Location**: After `:root` variables

**Add**:
```css
/* Font display optimization */
@font-face {
  font-family: 'Inter';
  font-display: swap;
}

/* Ensure font-display is set for all fonts */
* {
  font-display: swap;
}
```

**Actually Better**: Add to Google Fonts URL parameter (already done if `display=swap` is in URL)

**Verification**: Check if URL already has `&display=swap` - if yes, skip this step.

---

#### 1.2 Optimize Font Awesome Loading

**File**: `index.html` and `login.html`

**Location**: Font Awesome link (around line 9-10)

**Current Code**:
```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
```

**Optimized Code Options**:

**Option 1: Defer Loading**:
```html
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css"></noscript>
```

**Option 2: Load Only Needed Icons** (Better):
Instead of loading entire Font Awesome, only load specific icon fonts:
```html
<!-- Load only solid icons (most used) -->
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-solid-900.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/webfonts/fa-brands-400.woff2" as="font" type="font/woff2" crossorigin>
```

**Option 3: Self-Host Font Awesome** (Best Performance):
- Download Font Awesome CSS
- Host on Vercel
- Inline critical CSS
- Load fonts asynchronously

**Recommended**: Option 1 (Defer Loading) - Simplest implementation

---

### Phase 2: CSS Optimization

#### 2.1 Combine Critical CSS

**Strategy**: Identify critical CSS and inline it, defer non-critical CSS

**Critical CSS** (Above the fold):
- Base reset
- Header styles
- Card container styles
- Typography

**Non-Critical CSS** (Below the fold):
- Footer styles
- Admin panel styles
- Password setup modal
- Some card hover effects

**Implementation**:

**Option 1: Inline Critical CSS**

**File**: `index.html`

**Location**: In `<head>` section

**Add Before Other CSS Links**:
```html
<style>
/* Critical CSS - inline for faster rendering */
/* Copy critical styles from base.css, header.css, cards.css here */
/* Keep it under 14KB for optimal performance */
</style>
```

**Option 2: Load Non-Critical CSS Asynchronously**

**File**: `index.html`

**Location**: Move non-critical CSS links before `</body>`

**Move These CSS Files** (they're not critical):
- `css/admin-panel.css` (only for admin users)
- `css/password-setup.css` (only when needed)
- `css/footer.css` (below the fold)
- `css/profile.css` (only on profile page)

**Better Approach**: Load them conditionally with JavaScript

**Option 3: Combine CSS Files** (Recommended for Vercel)

Create a build step that combines CSS files:

**File**: Create `scripts/combine-css.js`

**Note**: For Vercel, this might not be feasible. Better to use Vercel's built-in optimization.

**Recommended Solution**: Use Vercel's automatic CSS optimization

**File**: `vercel.json`

**Add/Update**:
```json
{
  "headers": [
    {
      "source": "/css/(.*)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

#### 2.2 Optimize CSS Loading Order

**File**: `index.html`

**Current Order**: Sequential loading of 12 CSS files

**Optimized Order**:
1. Critical CSS (inline or load first)
2. Base CSS (required for variables)
3. Header CSS (above fold)
4. Cards CSS (above fold)
5. Forms CSS (when needed)
6. Defer rest

**Implementation**:

**File**: `index.html`

**Replace CSS Loading Section**:
```html
<!-- Critical CSS - Load First -->
<link rel="stylesheet" href="css/base.css">
<link rel="stylesheet" href="css/header.css">
<link rel="stylesheet" href="css/cards.css">
<link rel="stylesheet" href="css/loading.css">

<!-- Non-Critical CSS - Load Asynchronously -->
<link rel="preload" href="css/forms.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="css/forms.css"></noscript>

<link rel="preload" href="css/footer.css" as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="css/footer.css"></noscript>

<!-- Conditional CSS - Load Only When Needed -->
<!-- Admin panel CSS loaded only in admin.html -->
<!-- Password setup CSS loaded only when modal appears -->
```

---

#### 2.3 Add CSS Preloading

**File**: `index.html`

**Location**: In `<head>` before CSS links

**Add**:
```html
<!-- Preload Critical CSS -->
<link rel="preload" href="css/base.css" as="style">
<link rel="preload" href="css/header.css" as="style">
<link rel="preload" href="css/cards.css" as="style">
```

---

### Phase 3: Resource Hints

#### 3.1 Add DNS Prefetch and Preconnect

**File**: `index.html` and `login.html`

**Location**: In `<head>` section, before other links

**Add**:
```html
<!-- DNS Prefetch for External Resources -->
<link rel="dns-prefetch" href="https://fonts.googleapis.com">
<link rel="dns-prefetch" href="https://fonts.gstatic.com">
<link rel="dns-prefetch" href="https://cdnjs.cloudflare.com">

<!-- Preconnect to Critical External Domains -->
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="preconnect" href="https://cdnjs.cloudflare.com">
```

---

### Phase 4: Image Optimization

**Note**: User specified "do not change article dimensions" - so we optimize without changing sizes.

**File**: Check `js/views/ArticleView.js`

**Location**: Image loading

**Add Lazy Loading Attributes** (if not already present):
```javascript
// In createArticleHTML function
<img src="${article.image_path}" 
     alt="${article.title}" 
     loading="lazy" 
     decoding="async"
     onerror="this.src='/placeholder.jpg'">
```

**Add Fetch Priority**:
```javascript
// For above-the-fold images (first article)
<img src="${article.image_path}" 
     alt="${article.title}" 
     loading="eager"
     fetchpriority="high">
```

---

### Phase 5: Vercel Configuration

**File**: `vercel.json`

**Update/Create**:
```json
{
  "headers": [
    {
      "source": "/css/(.*\\.css)",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        },
        {
          "key": "Content-Type",
          "value": "text/css"
        }
      ]
    },
    {
      "source": "/(.*\\.(woff2|woff|ttf))",
      "headers": [
        {
          "key": "Cache-Control",
          "value": "public, max-age=31536000, immutable"
        }
      ]
    }
  ]
}
```

---

## 📋 Implementation Checklist

### Feature 1: Google Auth Password Setup

**Backend**:
- [ ] Update Google OAuth callback to check password status
- [ ] Redirect to login.html with setupPassword flag if needed
- [ ] Verify password setup endpoint works (/api/profile)

**Frontend - Login Page**:
- [ ] Add password setup modal HTML to login.html
- [ ] Add password-setup.css link
- [ ] Update Google OAuth callback handler
- [ ] Add password setup JavaScript functions
- [ ] Add form validation
- [ ] Add password visibility toggles
- [ ] Test new user flow
- [ ] Test existing user flow

**Testing**:
- [ ] New Google user → Shows password setup modal
- [ ] Existing user → Redirects to home
- [ ] Password setup → Can login with email/password
- [ ] Password setup → Can still login with Google

### Feature 2: Lighthouse Optimization

**Fonts**:
- [ ] Verify Google Fonts has display=swap
- [ ] Add preconnect for Google Fonts
- [ ] Optimize Font Awesome loading (defer or self-host)

**CSS**:
- [ ] Identify critical CSS
- [ ] Optimize CSS loading order
- [ ] Add preload for critical CSS
- [ ] Defer non-critical CSS
- [ ] Add cache headers in vercel.json

**Resource Hints**:
- [ ] Add DNS prefetch
- [ ] Add preconnect for external domains

**Images**:
- [ ] Verify lazy loading is enabled
- [ ] Add fetchpriority for above-fold images
- [ ] Add decoding="async"

**Vercel**:
- [ ] Update vercel.json with cache headers
- [ ] Test caching works

---

## ⚠️ Important Notes

### Serverless Function Limits

**Vercel Limit**: 12 serverless functions max

**Current Functions** (count):
1. `/api/auth` (handles status and google)
2. `/api/login`
3. `/api/register`
4. `/api/logout`
5. `/api/profile`
6. `/api/articles`
7. `/api/admin` (handles multiple types)

**Status**: Within limits (7 functions total)

### Article Dimensions

**Constraint**: Do NOT change article dimensions
- Keep card sizes the same
- Keep image aspect ratios (15:11)
- Keep grid layouts unchanged
- Only optimize loading/rendering performance

### Testing Requirements

1. **Functional Testing**:
   - Test Google sign up flow
   - Test Google sign in flow
   - Test password setup
   - Test dual login methods

2. **Performance Testing**:
   - Run Lighthouse before changes
   - Run Lighthouse after changes
   - Compare scores
   - Verify improvements

3. **Cross-Browser Testing**:
   - Chrome
   - Firefox
   - Safari
   - Edge

---

## 📊 Expected Results

### Feature 1: Google Auth
- ✅ New Google users see password setup on login page
- ✅ Users can login with either method after setup
- ✅ Seamless user experience

### Feature 2: Lighthouse
- ✅ Font display savings: ~680ms
- ✅ CSS loading optimization: ~220ms
- ✅ Google Fonts optimization: ~900ms
- ✅ Font Awesome optimization: ~1,130ms
- ✅ **Total expected improvement: ~2,930ms**

---

## 🚀 Implementation Order

1. **Feature 1 First** (User-facing feature)
   - Backend changes
   - Frontend changes
   - Testing

2. **Feature 2 Second** (Performance)
   - Font optimization
   - CSS optimization
   - Resource hints
   - Testing

---

**STATUS: READY FOR IMPLEMENTATION** ✅

**Version**: 1.0  
**Last Updated**: [Current Date]  
**Estimated Implementation Time**: 
- Feature 1: 2-3 hours
- Feature 2: 1-2 hours
- **Total**: 3-5 hours

---

**END OF PLAN**

