# Admin Tier System Implementation Plan

## 📋 FEATURE OVERVIEW

Implement a three-tier user system:
1. **Super Admin** - Full access (existing, keep as is)
2. **Admin** - Limited access (NEW - can manage articles only)
3. **User** - Regular user access (existing)

---

## 🎯 REQUIREMENTS

### For Super Admin:
1. ✅ Can promote regular users to Admin role
2. ✅ Can demote Admins back to regular users
3. ✅ New "Admins" section in sidebar showing all admins
4. ✅ Users list shows Admin role and has promote/demote buttons

### For Admin:
1. ✅ Can access admin panel (limited version)
2. ✅ Can see article counts and list
3. ✅ Can delete articles
4. ❌ **CANNOT** see user count or user list
5. ❌ **CANNOT** access Users or Admins sections

---

## 🔍 EXISTING CODE ANALYSIS

### What EXISTS (Use As-Is):
1. ✅ `isAdmin` field exists in database (returned in `api/auth.js`)
2. ✅ Super Admin authentication (`requireSuperAdmin` in `api/admin.js`)
3. ✅ Admin panel UI (`admin.html`)
4. ✅ Article management functionality
5. ✅ User list display

### What NEEDS MODIFICATION:
1. ❌ API: Add `isAdmin` field to user responses
2. ❌ API: Add endpoint to promote/demote users
3. ❌ API: Add permission check for Admin role (not just Super Admin)
4. ❌ Frontend: Update user list to show Admin role
5. ❌ Frontend: Add promote/demote buttons
6. ❌ Frontend: Add "Admins" section to sidebar
7. ❌ Frontend: Modify admin panel access check (allow Admins too)
8. ❌ Frontend: Hide user-related features for Admins

---

## ✅ IMPLEMENTATION PLAN

### Phase 1: Backend API Changes

#### Fix 1.1: Add `isAdmin` Field to User Responses

**File:** `api/admin.js`

**Location:** `handleUsers` function - GET method (around line 493-499)

**Current Code:**
```javascript
const formattedUsers = users.map(user => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  isSuperAdmin: user.isSuperAdmin || false,
  created_at: user.created_at
}));
```

**Change To:**
```javascript
const formattedUsers = users.map(user => ({
  id: user._id.toString(),
  name: user.name,
  email: user.email,
  isSuperAdmin: user.isSuperAdmin || false,
  isAdmin: user.isAdmin || false,  // ADD THIS LINE
  created_at: user.created_at
}));
```

---

#### Fix 1.2: Add Admin Permission Middleware

**File:** `api/admin.js`

**Location:** After `requireSuperAdmin` function (around line 93)

**Add New Function:**
```javascript
// Middleware to check if user is super admin OR admin
async function requireAdminAccess(req) {
  const token = extractToken(req.headers.authorization);
  if (!token) {
    return { authorized: false, error: 'Unauthorized' };
  }
  
  const decoded = verifyToken(token);
  if (!decoded) {
    return { authorized: false, error: 'Invalid token' };
  }

  try {
    const { db } = await connectToDatabase();
    const usersCollection = db.collection('users');
    
    const user = await usersCollection.findOne({ 
      email: decoded.email.toLowerCase() 
    });
    
    // Allow if super admin OR admin
    if (!user || (!user.isSuperAdmin && !user.isAdmin)) {
      return { authorized: false, error: 'Admin access required' };
    }
    
    return { authorized: true, user, isSuperAdmin: user.isSuperAdmin || false };
  } catch (error) {
    return { authorized: false, error: 'Database error' };
  }
}
```

---

#### Fix 1.3: Add Promote/Demote Admin Endpoint

**File:** `api/admin.js`

**Location:** In `handleUsers` function, add after DELETE method (around line 600)

**Add PATCH Method:**
```javascript
// PATCH - Promote/Demote user to/from Admin
if (req.method === 'PATCH') {
  const body = await parseRequestBody(req);
  const { userId, isAdmin } = body;

  if (!userId || typeof isAdmin !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'userId and isAdmin (boolean) are required'
    });
  }

  // Prevent modifying super admin
  const userToModify = await usersCollection.findOne({ _id: new ObjectId(userId) });
  if (userToModify && userToModify.isSuperAdmin) {
    return res.status(403).json({
      success: false,
      error: 'Cannot modify super admin role'
    });
  }

  // Update user's admin status
  await usersCollection.updateOne(
    { _id: new ObjectId(userId) },
    { $set: { isAdmin: isAdmin } }
  );

  // Fetch updated user
  const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

  return res.status(200).json({
    success: true,
    user: {
      id: updatedUser._id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      isSuperAdmin: updatedUser.isSuperAdmin || false,
      isAdmin: updatedUser.isAdmin || false
    },
    message: isAdmin ? 'User promoted to admin' : 'Admin demoted to user'
  });
}
```

**Update Method Check:**
Change line 602 from:
```javascript
return res.status(405).json({ error: 'Method not allowed' });
```

To:
```javascript
if (req.method !== 'PATCH') {
  return res.status(405).json({ error: 'Method not allowed' });
}
```

---

#### Fix 1.4: Restrict Article Endpoints for Admins

**File:** `api/admin.js`

**Location:** `handleArticles` function (find where it starts)

**Current:** Uses `requireSuperAdmin` only

**Change To:**
- For article viewing/listing: Use `requireAdminAccess` (allows both Super Admin and Admin)
- Keep as-is (already allows both through `requireAdminAccess`)

**Check the `handleArticles` function:**
- If it uses `requireSuperAdmin`, change to `requireAdminAccess`
- Article operations (view, delete, edit) should work for both Super Admin and Admin

---

#### Fix 1.5: Keep User Endpoints Super-Admin-Only

**File:** `api/admin.js`

**Location:** `handleUsers` function

**Action:** Ensure `handleUsers` still uses `requireSuperAdmin` (NOT `requireAdminAccess`)
- Only Super Admin should access user management
- Admins should NOT see user list

---

#### Fix 1.6: Add GET Admins Endpoint

**File:** `api/admin.js`

**Location:** After `handleUsers` function, add new handler

**Add New Function:**
```javascript
// Handle Admins Operations (list all admins)
async function handleAdmins(req, res, db) {
  const usersCollection = db.collection('users');

  // GET - List all admins (super admins and regular admins)
  if (req.method === 'GET') {
    const admins = await usersCollection
      .find({
        $or: [
          { isSuperAdmin: true },
          { isAdmin: true }
        ]
      })
      .project({ password: 0 })
      .sort({ created_at: -1 })
      .toArray();

    const formattedAdmins = admins.map(user => ({
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin || false,
      isAdmin: user.isAdmin || false,
      created_at: user.created_at
    }));

    return res.status(200).json({
      success: true,
      admins: formattedAdmins
    });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
```

**Update Main Handler:**
In the main `handler` function (around line 140-200), add routing for admins:

```javascript
// In the switch/if-else for type parameter:
case 'admins':
  authCheck = await requireSuperAdmin(req);  // Only super admin can see admins list
  if (!authCheck.authorized) {
    return res.status(403).json({
      success: false,
      error: authCheck.error
    });
  }
  return await handleAdmins(req, res, db);
```

---

### Phase 2: Frontend Changes - Admin Panel Access

#### Fix 2.1: Update Admin Panel Access Check

**File:** `js/admin/AdminController.js`

**Location:** `init()` function (around line 10-19)

**Current Code:**
```javascript
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
    // ... rest of code
}
```

**Change To:**
```javascript
async init() {
    // Check if user is super admin OR admin
    const accessCheck = await this.checkAdminAccess();
    if (!accessCheck.hasAccess) {
        this.showError('Access denied. Admin access required.');
        setTimeout(() => {
            window.location.href = '/index.html';
        }, 2000);
        return;
    }

    // Store user role
    this.isSuperAdmin = accessCheck.isSuperAdmin;
    this.isAdmin = accessCheck.isAdmin;

    // Only super admin can see users section
    if (!this.isSuperAdmin) {
        // Hide Users section from sidebar
        const usersNavItem = document.querySelector('[data-section="users"]');
        if (usersNavItem) usersNavItem.style.display = 'none';
        
        // Hide Admins section from sidebar
        const adminsNavItem = document.querySelector('[data-section="admins"]');
        if (adminsNavItem) adminsNavItem.style.display = 'none';
    }

    // Load users (only if super admin)
    if (this.isSuperAdmin) {
        await this.loadAllUsers();
    }

    // Setup event listeners
    this.setupEventListeners();

    // Load dashboard statistics
    await this.updateDashboard();
}
```

---

#### Fix 2.2: Add Admin Access Check Function

**File:** `js/admin/AdminController.js`

**Location:** After `checkSuperAdminAccess()` function (around line 216)

**Add New Function:**
```javascript
/**
 * Check if current user has admin access (super admin or admin)
 */
async checkAdminAccess() {
    const authToken = localStorage.getItem('authToken');
    if (!authToken) {
        return { hasAccess: false, isSuperAdmin: false, isAdmin: false };
    }

    try {
        const response = await fetch('/api/auth/status', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        const data = await response.json();
        
        if (data.authenticated && data.user) {
            const isSuperAdmin = data.user.isSuperAdmin === true;
            const isAdmin = data.user.isAdmin === true;
            const hasAccess = isSuperAdmin || isAdmin;
            
            return { 
                hasAccess: hasAccess,
                isSuperAdmin: isSuperAdmin,
                isAdmin: isAdmin
            };
        }
        
        return { hasAccess: false, isSuperAdmin: false, isAdmin: false };
    } catch (error) {
        console.error('Admin access check error:', error);
        return { hasAccess: false, isSuperAdmin: false, isAdmin: false };
    }
},
```

**Keep Old Function (for backward compatibility):**
```javascript
/**
 * Check if current user is super admin (DEPRECATED - use checkAdminAccess)
 */
async checkSuperAdminAccess() {
    const accessCheck = await this.checkAdminAccess();
    return accessCheck.isSuperAdmin;
},
```

---

#### Fix 2.3: Update Dashboard to Hide User Count for Admins

**File:** `js/admin/AdminController.js`

**Location:** `updateDashboard()` function (around line 66-83)

**Modify:**
```javascript
// Load users statistics (only for super admin)
if (this.isSuperAdmin) {
    const usersResponse = await fetch('/api/admin?type=users', {
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
} else {
    // Hide user count card for admins
    const userStatCard = document.querySelector('.stat-card:nth-child(3)'); // Adjust selector as needed
    if (userStatCard) userStatCard.style.display = 'none';
}
```

---

### Phase 3: Frontend Changes - User Management UI

#### Fix 3.1: Add "Admins" Section to Sidebar

**File:** `admin.html`

**Location:** Sidebar navigation (around line 35-43)

**Current:**
```html
<a href="#users" class="nav-item" data-section="users">
    <i class="fas fa-users"></i>
    <span>Users</span>
    <span class="badge" id="usersBadge">0</span>
</a>
<a href="#settings" class="nav-item" data-section="settings">
    <i class="fas fa-cog"></i>
    <span>Settings</span>
</a>
```

**Add After Users (before Settings):**
```html
<a href="#admins" class="nav-item" data-section="admins">
    <i class="fas fa-user-shield"></i>
    <span>Admins</span>
    <span class="badge" id="adminsBadge">0</span>
</a>
```

---

#### Fix 3.2: Add Admins Section Content

**File:** `admin.html`

**Location:** After Users section (around line 254), before Settings section

**Add:**
```html
<!-- Admins Management Section -->
<section class="admin-section" id="adminsSection">
    <div class="admin-card">
        <div class="card-header">
            <h2><i class="fas fa-user-shield"></i> All Admins</h2>
        </div>
        <div id="adminsList">
            <div class="loading">
                <i class="fas fa-spinner fa-spin"></i> Loading admins...
            </div>
        </div>
    </div>
</section>
```

---

#### Fix 3.3: Update User List to Show Admin Role and Buttons

**File:** `js/admin/AdminController.js`

**Location:** `renderUsersList()` function (around line 285-287)

**Current Code:**
```javascript
const roleBadge = user.isSuperAdmin 
    ? '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>'
    : '<span>User</span>';
```

**Change To:**
```javascript
let roleBadge;
if (user.isSuperAdmin) {
    roleBadge = '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>';
} else if (user.isAdmin) {
    roleBadge = '<span class="admin-badge"><i class="fas fa-user-shield"></i> Admin</span>';
} else {
    roleBadge = '<span>User</span>';
}
```

---

#### Fix 3.4: Add Promote/Demote Buttons to User List

**File:** `js/admin/AdminController.js`

**Location:** `renderUsersList()` function - Actions column (around line 295-301)

**Current Code:**
```javascript
<td>
    ${!user.isSuperAdmin ? `
        <button class="delete-btn" onclick="AdminController.deleteUser('${user.id}')">
            <i class="fas fa-trash"></i> Delete
        </button>
    ` : '<span style="color: #999;">-</span>'}
</td>
```

**Change To:**
```javascript
<td>
    ${!user.isSuperAdmin ? `
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${user.isAdmin ? `
                <button class="btn btn-warning btn-sm" onclick="AdminController.demoteFromAdmin('${user.id}')" title="Remove Admin Role">
                    <i class="fas fa-arrow-down"></i> Remove Admin
                </button>
            ` : `
                <button class="btn btn-success btn-sm" onclick="AdminController.promoteToAdmin('${user.id}')" title="Make Admin">
                    <i class="fas fa-arrow-up"></i> Make Admin
                </button>
            `}
            <button class="delete-btn btn-sm" onclick="AdminController.deleteUser('${user.id}')">
                <i class="fas fa-trash"></i> Delete
            </button>
        </div>
    ` : '<span style="color: #999;">-</span>'}
</td>
```

---

#### Fix 3.5: Add Promote/Demote Functions

**File:** `js/admin/AdminController.js`

**Location:** After `deleteUser()` function (around line 377)

**Add New Functions:**
```javascript
/**
 * Promote user to admin role
 */
async promoteToAdmin(userId) {
    if (!confirm('Are you sure you want to promote this user to Admin? They will gain access to the admin panel.')) {
        return;
    }

    const authToken = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/admin?type=users`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId, isAdmin: true })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            this.showSuccess('User promoted to Admin successfully!');
            await this.loadAllUsers();
            await this.loadAllAdmins(); // Refresh admins list if visible
        } else {
            throw new Error(data.error || 'Failed to promote user');
        }
    } catch (error) {
        console.error('Promote to admin error:', error);
        this.showError(error.message || 'Failed to promote user');
    }
},

/**
 * Demote admin to regular user
 */
async demoteFromAdmin(userId) {
    if (!confirm('Are you sure you want to remove Admin role from this user? They will lose access to the admin panel.')) {
        return;
    }

    const authToken = localStorage.getItem('authToken');

    try {
        const response = await fetch(`/api/admin?type=users`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({ userId, isAdmin: false })
        });

        const data = await response.json();

        if (response.ok && data.success) {
            this.showSuccess('Admin role removed successfully!');
            await this.loadAllUsers();
            await this.loadAllAdmins(); // Refresh admins list
        } else {
            throw new Error(data.error || 'Failed to demote admin');
        }
    } catch (error) {
        console.error('Demote from admin error:', error);
        this.showError(error.message || 'Failed to demote admin');
    }
},
```

---

#### Fix 3.6: Add Load Admins Function

**File:** `js/admin/AdminController.js`

**Location:** After `loadAllUsers()` function (around line 253)

**Add New Function:**
```javascript
/**
 * Load all admins from API
 */
async loadAllAdmins() {
    const adminsListDiv = document.getElementById('adminsList');
    const authToken = localStorage.getItem('authToken');

    if (!adminsListDiv) return; // Section might be hidden for admins

    try {
        const response = await fetch('/api/admin?type=admins', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });

        if (!response.ok) {
            if (response.status === 403 || response.status === 401) {
                throw new Error('Super admin access required');
            }
            throw new Error('Failed to load admins');
        }

        const data = await response.json();
        if (data.success && data.admins) {
            this.renderAdminsList(data.admins);
            
            // Update badge
            const adminsBadge = document.getElementById('adminsBadge');
            if (adminsBadge) adminsBadge.textContent = data.admins.length;
        } else {
            throw new Error('Invalid response from server');
        }
    } catch (error) {
        console.error('Load admins error:', error);
        adminsListDiv.innerHTML = `
            <div class="error-message">
                <i class="fas fa-exclamation-circle"></i> ${error.message}
            </div>
        `;
    }
},

/**
 * Render admins list
 */
renderAdminsList(admins) {
    const adminsListDiv = document.getElementById('adminsList');

    if (admins.length === 0) {
        adminsListDiv.innerHTML = '<p>No admins found.</p>';
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

    admins.forEach(user => {
        const createdDate = user.created_at 
            ? new Date(user.created_at).toLocaleDateString() 
            : 'N/A';
        
        let roleBadge;
        if (user.isSuperAdmin) {
            roleBadge = '<span class="super-admin-badge"><i class="fas fa-crown"></i> Super Admin</span>';
        } else if (user.isAdmin) {
            roleBadge = '<span class="admin-badge"><i class="fas fa-user-shield"></i> Admin</span>';
        }

        tableHTML += `
            <tr>
                <td>${this.escapeHtml(user.name)}</td>
                <td>${this.escapeHtml(user.email)}</td>
                <td>${roleBadge}</td>
                <td>${createdDate}</td>
                <td>
                    ${!user.isSuperAdmin && user.isAdmin ? `
                        <button class="btn btn-warning btn-sm" onclick="AdminController.demoteFromAdmin('${user.id}')">
                            <i class="fas fa-arrow-down"></i> Remove Admin
                        </button>
                    ` : '<span style="color: #999;">-</span>'}
                </td>
            </tr>
        `;
    });

    tableHTML += `
            </tbody>
        </table>
    `;

    adminsListDiv.innerHTML = tableHTML;
},
```

---

#### Fix 3.7: Add Section Navigation Handler

**File:** `js/admin/AdminController.js`

**Location:** `setupEventListeners()` function (around line 420)

**Add:**
```javascript
// Load admins when section is clicked (if super admin)
const adminsNavItem = document.querySelector('[data-section="admins"]');
if (adminsNavItem && this.isSuperAdmin) {
    adminsNavItem.addEventListener('click', async () => {
        await this.loadAllAdmins();
    });
}
```

**Also update section switching logic** (if there's a section switcher):
- When switching to "admins" section, call `loadAllAdmins()`

---

#### Fix 3.8: Update Section Visibility Logic

**File:** `js/admin/admin.js` (if exists, or in AdminController)

**Location:** Section navigation/switching code

**Action:** Ensure Admins section is only visible to Super Admin
- Hide from regular Admins
- Show only to Super Admin

---

### Phase 4: CSS Styling

#### Fix 4.1: Add Admin Badge Styles

**File:** `css/admin-panel.css`

**Location:** After super-admin-badge styles (find similar badge styles)

**Add:**
```css
.admin-badge {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 12px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 12px;
    font-size: 12px;
    font-weight: 600;
}

.admin-badge i {
    font-size: 11px;
}
```

---

#### Fix 4.2: Add Button Styles for Promote/Demote

**File:** `css/admin-panel.css`

**Add:**
```css
.btn-sm {
    padding: 6px 12px;
    font-size: 12px;
}

.btn-success {
    background: #10b981;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 6px;
}

.btn-success:hover {
    background: #059669;
}

.btn-warning {
    background: #f59e0b;
    color: white;
    border: none;
    cursor: pointer;
    border-radius: 6px;
}

.btn-warning:hover {
    background: #d97706;
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Backend (api/admin.js):
- [ ] Add `isAdmin` field to user responses (handleUsers GET)
- [ ] Add `requireAdminAccess()` function
- [ ] Add PATCH method to promote/demote users
- [ ] Update article endpoints to use `requireAdminAccess` (instead of requireSuperAdmin)
- [ ] Add `handleAdmins()` function
- [ ] Add routing for `type=admins` in main handler

### Frontend - Access Control:
- [ ] Update `AdminController.init()` to use `checkAdminAccess()`
- [ ] Add `checkAdminAccess()` function
- [ ] Hide Users/Admins sections for regular Admins
- [ ] Update dashboard to hide user count for Admins

### Frontend - User Management:
- [ ] Update `renderUsersList()` to show Admin role badge
- [ ] Add promote/demote buttons to user list
- [ ] Add `promoteToAdmin()` function
- [ ] Add `demoteFromAdmin()` function
- [ ] Update `renderUsersListInModal()` similarly (if modal version exists)

### Frontend - Admins Section:
- [ ] Add "Admins" nav item to sidebar (admin.html)
- [ ] Add Admins section HTML
- [ ] Add `loadAllAdmins()` function
- [ ] Add `renderAdminsList()` function
- [ ] Add section navigation handler

### Frontend - Styling:
- [ ] Add `.admin-badge` CSS styles
- [ ] Add `.btn-success` and `.btn-warning` styles
- [ ] Add `.btn-sm` style

### Testing:
- [ ] Test Super Admin can promote users
- [ ] Test Super Admin can demote admins
- [ ] Test Admin can access admin panel
- [ ] Test Admin cannot see Users section
- [ ] Test Admin cannot see Admins section
- [ ] Test Admin can see and manage articles
- [ ] Test Admin cannot see user count
- [ ] Test Admins section shows all admins correctly

---

## 🗑️ CODE TO DELETE/MODIFY

### DELETE These Sections:
1. **Nothing to delete** - All code will be modified/extended

### MODIFY These Sections:
1. `api/admin.js` - `handleUsers` GET response (add isAdmin)
2. `api/admin.js` - Article endpoints (change to requireAdminAccess)
3. `js/admin/AdminController.js` - `init()` function
4. `js/admin/AdminController.js` - `renderUsersList()` function
5. `admin.html` - Sidebar navigation (add Admins)
6. `admin.html` - Add Admins section

---

## ⚠️ IMPORTANT NOTES

1. **Super Admin cannot be modified:**
   - Cannot promote/demote super admin
   - Cannot delete super admin
   - Checks should prevent this

2. **Admin Permissions:**
   - Can manage articles (view, delete, edit)
   - Cannot manage users
   - Cannot see user count
   - Cannot access Users or Admins sections

3. **Role Hierarchy:**
   - Super Admin > Admin > User
   - Super Admin can do everything
   - Admin can manage articles only
   - User has no admin access

4. **Existing Features to Keep:**
   - All existing super admin functionality
   - All existing article management
   - All existing user management (for super admin)

---

## 🎯 EXPECTED RESULT

After implementation:

1. ✅ Super Admin sees:
   - Dashboard with all stats
   - Articles section
   - Users section (with promote/demote buttons)
   - **NEW:** Admins section (list of all admins)

2. ✅ Admin sees:
   - Dashboard with article stats only (no user count)
   - Articles section (can manage)
   - Users section: **HIDDEN**
   - Admins section: **HIDDEN**

3. ✅ User Management:
   - Super Admin can promote users to Admin
   - Super Admin can demote Admins to User
   - User list shows role badges (Super Admin, Admin, User)
   - Promote/demote buttons visible for eligible users

---

**STATUS: COMPREHENSIVE PLAN READY FOR IMPLEMENTATION** ✅

**All code modifications are clearly marked with file locations and line numbers** ✅

