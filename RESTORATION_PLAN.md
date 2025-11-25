# Critical Issues Restoration Plan

## 🔴 CRITICAL ISSUES IDENTIFIED

### Issue 1: Git Merge Conflict Blocking Deployment
**File:** `api/auth/status.js`
**Problem:** Lines 84-150 contain unresolved merge conflict markers:
```
<<<<<<< HEAD
... code ...
=======
... code ...
>>>>>>> parent of eaf0c1a
```
**Impact:** This syntax error prevents deployment on Vercel

### Issue 2: Missing Email/Password Login Form
**File:** `login.html`
**Problem:** Login page only shows Google login button, no email/password form
**Impact:** Users cannot log in with email/password (network error)

### Issue 3: Super Admin Credentials Protection
**Problem:** Need to ensure super admin cannot be deleted or have credentials modified

---

## ✅ SOLUTION PLAN

### Priority 1: Fix Merge Conflict (URGENT - Blocks Deployment)

#### Fix File: `api/auth/status.js`

**Action:** Remove merge conflict markers and keep the correct version

**Corrected Code (lines 84-150):**
```javascript
// Look up user in database to get latest info
try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
        email: decoded.email.toLowerCase().trim()
    });
    
    // CRITICAL: If user doesn't exist, they were deleted - invalidate token
    if (!user) {
        return res.status(200).json({
            authenticated: false,
            error: 'User account no longer exists'
        });
    }
    
    // Check if this is super admin email and update if needed
    const isSuperAdminEmail = decoded.email.toLowerCase().trim() === 'motupallisarathchandra@gmail.com';
    let isSuperAdmin = user.isSuperAdmin || false;
    
    // If email matches super admin but DB doesn't have the flag, update it
    if (isSuperAdminEmail && !user.isSuperAdmin) {
        await usersCollection.updateOne(
            { _id: user._id },
            { $set: { isSuperAdmin: true } }
        );
        isSuperAdmin = true;
    }
    
    // Determine if user needs password setup
    // Only Google OAuth users without password need to set one
    const authProvider = user.authProvider || 'email';
    const needsPasswordSetup = !user.password && (authProvider === 'google' || !user.authProvider);
    
    return res.status(200).json({
        authenticated: true,
        user: {
            id: user._id.toString(),
            name: user.name,
            email: user.email,
            isSuperAdmin: isSuperAdmin,
            isAdmin: user.isAdmin || false,
            hasPassword: !!user.password,
            needsPasswordSetup: needsPasswordSetup,
            authProvider: authProvider
        }
    });
} catch (dbError) {
    // If DB lookup fails, return unauthenticated for safety
    console.error('Database error in auth status check:', dbError);
    return res.status(200).json({
        authenticated: false,
        error: 'Authentication check failed'
    });
}
```

**Complete File Structure:**
- Keep lines 1-83 as is
- Replace lines 84-150 with corrected code above
- Keep lines 151-168 as is (but they won't be reached with the corrected code)

---

### Priority 2: Restore Email/Password Login Form

#### Fix File: `login.html`

**Current State:** Only Google login button exists

**Action:** Add email/password login form with toggle option

**New HTML Structure:**
```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proto - Login</title>
    <!-- Google Fonts -->
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <!-- Font Awesome -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css">
    <!-- CSS Module -->
    <link rel="stylesheet" href="css/auth.css">
</head>
<body>
    <script>
        // Redirect safely if opened via file:// to avoid network errors
        (function(){
            if (location.protocol === 'file:') {
                var target = 'http://localhost:3000/login';
                try { window.location.replace(target); } catch(_) { window.location.href = target; }
            }
        })();
    </script>
    <div class="login-container">
        <div class="logo">
            <h1>Proto</h1>
            <p>Your Campus News Source</p>
        </div>

        <div class="error-message" id="errorMessage" style="display: none;"></div>

        <!-- Login Form Toggle -->
        <div class="login-toggle">
            <button class="toggle-btn active" id="emailLoginToggle">Email Login</button>
            <button class="toggle-btn" id="googleLoginToggle">Google Login</button>
        </div>

        <!-- Email/Password Login Form -->
        <div class="login-form-container" id="emailLoginForm">
            <form id="loginForm">
                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" name="email" required autocomplete="email" placeholder="Enter your email">
                </div>
                <div class="form-group">
                    <label for="password">Password</label>
                    <div class="password-input-wrapper">
                        <input type="password" id="password" name="password" required autocomplete="current-password" placeholder="Enter your password">
                        <button type="button" class="password-toggle" id="passwordToggle" aria-label="Toggle password visibility">
                            <i class="fas fa-eye" id="passwordToggleIcon"></i>
                        </button>
                    </div>
                </div>
                <button type="submit" class="submit-btn" id="loginBtn">
                    <span id="loginBtnText">Sign In</span>
                    <div class="loading" id="loading" style="display: none;">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                </button>
            </form>
            <p class="register-link">
                Don't have an account? <a href="#" id="showRegisterBtn">Sign up</a>
            </p>
        </div>

        <!-- Google Login Section -->
        <div class="google-login-section" id="googleLoginSection" style="display: none;">
            <p class="login-description">Sign in with your Google account to continue</p>
            <button class="google-btn" id="googleLoginBtn">
                <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
                    <path fill="#4285F4" d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z"/>
                    <path fill="#34A853" d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332C2.438 15.983 5.482 18 9 18z"/>
                    <path fill="#FBBC05" d="M3.964 10.712c-.18-.54-.282-1.117-.282-1.712 0-.595.102-1.172.282-1.712V4.956H.957C.347 6.175 0 7.55 0 9c0 1.45.348 2.825.957 4.044l3.007-2.332z"/>
                    <path fill="#EA4335" d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0 5.482 0 2.438 2.017.957 4.956L3.964 7.288C4.672 5.163 6.656 3.58 9 3.58z"/>
                </svg>
                Continue with Google
            </button>
        </div>
    </div>

    <!-- JavaScript Module -->
    <script src="js/auth/login.js"></script>
</body>
</html>
```

#### Fix File: `js/auth/login.js`

**Action:** Add email/password login functionality

**Add these functions:**
```javascript
/**
 * Handles email/password login
 */
async function login(email, password) {
    const loginBtn = document.getElementById('loginBtn');
    const loading = document.getElementById('loading');
    const loginBtnText = document.getElementById('loginBtnText');
    
    loginBtn.disabled = true;
    loading.style.display = 'inline-block';
    loginBtnText.textContent = 'Signing in...';
    clearErrors();
    
    try {
        const response = await fetch('/api/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
            // Store token
            if (data.token) {
                localStorage.setItem('authToken', data.token);
            }
            
            // Redirect to home
            window.location.href = '/index.html';
        } else {
            throw new Error(data.error || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showError(error.message || 'Failed to login. Please check your credentials.');
        loginBtn.disabled = false;
        loading.style.display = 'none';
        loginBtnText.textContent = 'Sign In';
    }
}

/**
 * Handles form toggle
 */
function setupFormToggle() {
    const emailToggle = document.getElementById('emailLoginToggle');
    const googleToggle = document.getElementById('googleLoginToggle');
    const emailForm = document.getElementById('emailLoginForm');
    const googleSection = document.getElementById('googleLoginSection');
    
    if (emailToggle && googleToggle) {
        emailToggle.addEventListener('click', () => {
            emailToggle.classList.add('active');
            googleToggle.classList.remove('active');
            emailForm.style.display = 'block';
            googleSection.style.display = 'none';
        });
        
        googleToggle.addEventListener('click', () => {
            googleToggle.classList.add('active');
            emailToggle.classList.remove('active');
            emailForm.style.display = 'none';
            googleSection.style.display = 'block';
        });
    }
}

/**
 * Clears error messages
 */
function clearErrors() {
    const errorDiv = document.getElementById('errorMessage');
    if (errorDiv) {
        errorDiv.style.display = 'none';
        errorDiv.textContent = '';
    }
}

/**
 * Sets up password toggle visibility
 */
function setupPasswordToggle() {
    const passwordInput = document.getElementById('password');
    const toggleBtn = document.getElementById('passwordToggle');
    const toggleIcon = document.getElementById('passwordToggleIcon');
    
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
}
```

**Update DOMContentLoaded event:**
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

    // Setup form toggle
    setupFormToggle();
    
    // Setup password toggle
    setupPasswordToggle();

    // Login form submission
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const password = document.getElementById('password').value;
            
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            
            await login(email, password);
        });
    }

    // Google login button
    const googleBtn = document.getElementById('googleLoginBtn');
    if (googleBtn) {
        googleBtn.addEventListener('click', handleGoogleLogin);
    }
});
```

#### Update CSS File: `css/auth.css`

**Add styles for toggle buttons and email form:**
```css
/* Login Toggle */
.login-toggle {
    display: flex;
    gap: 0.5rem;
    margin-bottom: 2rem;
    border-bottom: 2px solid #e1e5e9;
}

.toggle-btn {
    flex: 1;
    padding: 0.75rem;
    background: none;
    border: none;
    border-bottom: 3px solid transparent;
    color: #666;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.3s ease;
    font-size: 0.95rem;
}

.toggle-btn.active {
    color: #667eea;
    border-bottom-color: #667eea;
}

.toggle-btn:hover {
    color: #667eea;
}

/* Login Form Container */
.login-form-container {
    width: 100%;
}

.submit-btn {
    width: 100%;
    padding: 1rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 1rem;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    margin-top: 1rem;
}

.submit-btn:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 10px 25px rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
    opacity: 0.7;
    cursor: not-allowed;
}

.register-link {
    text-align: center;
    margin-top: 1.5rem;
    color: #666;
    font-size: 0.9rem;
}

.register-link a {
    color: #667eea;
    text-decoration: none;
    font-weight: 600;
}

.register-link a:hover {
    text-decoration: underline;
}
```

---

### Priority 3: Ensure Super Admin Protection

#### Verify File: `api/admin/users.js`

**Current Protection:**
- Line 185: Prevents deleting super admin ✅
- Line 207: Bulk delete excludes super admin ✅

**Action:** Ensure these protections are working correctly - they appear to be in place.

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Fix Merge Conflict (CRITICAL)
- [ ] Open `api/auth/status.js`
- [ ] Remove merge conflict markers (lines 84, 124, 150)
- [ ] Keep the corrected version as specified above
- [ ] Test that file has no syntax errors

### Step 2: Restore Email/Password Login
- [ ] Update `login.html` with new HTML structure
- [ ] Update `js/auth/login.js` with email/password login functions
- [ ] Update `css/auth.css` with toggle and form styles
- [ ] Test email/password login works

### Step 3: Verify Deployment
- [ ] Commit all changes
- [ ] Push to repository
- [ ] Verify Vercel deployment succeeds
- [ ] Test login functionality on deployed site

---

## 🔧 REQUIRED ENVIRONMENT VARIABLES

Ensure these are set in Vercel:
- `MONGODB_URI` - MongoDB Atlas connection string
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `GOOGLE_REDIRECT_URI` - Google OAuth redirect URI
- `FRONTEND_URL` - Frontend URL (e.g., https://proto-social.vercel.app)
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret
- `JWT_SECRET` - JWT secret for token generation

---

## 📝 TESTING CHECKLIST

### After Fixes Applied:

**Test 1: Merge Conflict Fixed**
- [ ] `api/auth/status.js` has no merge conflict markers
- [ ] File syntax is valid JavaScript
- [ ] Deployment succeeds on Vercel

**Test 2: Email/Password Login**
- [ ] Login page shows email/password form by default
- [ ] Can toggle between email and Google login
- [ ] Email/password login works correctly
- [ ] Error messages display properly
- [ ] Password toggle visibility works

**Test 3: Google Login**
- [ ] Google login button works
- [ ] OAuth flow completes successfully
- [ ] Redirects to home page after login

**Test 4: Super Admin Protection**
- [ ] Cannot delete super admin user
- [ ] Bulk delete excludes super admin
- [ ] Super admin credentials preserved

---

## 🚨 ROLLBACK PLAN

If issues persist:

1. **Check Vercel deployment logs** for specific error messages
2. **Verify environment variables** are set correctly
3. **Test API endpoints** individually:
   - `/api/health` - Should return OK
   - `/api/auth/status` - Should not have syntax errors
   - `/api/login` - Should accept POST requests

4. **Database Check:**
   - Verify MongoDB connection is working
   - Check super admin user exists in database
   - Verify user credentials are correct

---

## 📞 SUPPORT INFORMATION NEEDED

Please provide:
1. **MongoDB Atlas Connection String** - To verify database connection
2. **Cloudinary Credentials** - Cloud name, API key, API secret
3. **Vercel Deployment URL** - To check deployment status
4. **Any specific error messages** from Vercel deployment logs

---

## ✅ EXPECTED OUTCOME

After implementing these fixes:
1. ✅ Deployment will succeed (no merge conflict)
2. ✅ Users can login with email/password
3. ✅ Users can login with Google
4. ✅ Super admin is protected
5. ✅ Website functions as before

---

**Priority Order:**
1. **Fix merge conflict FIRST** - This blocks all deployments
2. **Restore email/password login** - Essential functionality
3. **Verify super admin protection** - Already in place, just verify

**Estimated Time:** 30-45 minutes for all fixes

