# Module Import Error Fix Plan

## 🔴 CRITICAL ERROR IDENTIFIED

**Vercel Error:**
```
Cannot find module '../utils/jwt.js'
Require stack: /var/task/api/login.js
```

**Root Cause:** Wrong import path - using `../utils/jwt.js` instead of `./utils/jwt.js`

---

## 🔍 PROBLEM EXPLAINED

### File Structure:
```
api/
├── login.js          ← Trying to import jwt.js
├── register.js       ← Trying to import jwt.js
├── profile.js        ← Trying to import jwt.js
└── utils/
    └── jwt.js        ← The actual file location
```

### The Problem:

**WRONG path (current):**
```javascript
import { generateToken } from '../utils/jwt.js';
//       ↑
//       This goes UP one level (to root), then looks for utils/
//       But utils/ is INSIDE api/, not at root level!
```

**CORRECT path:**
```javascript
import { generateToken } from './utils/jwt.js';
//       ↑
//       This stays in api/ directory, then goes into utils/ subdirectory
```

### Why `../` is Wrong:
- `../` = Go up one directory level
- From `api/login.js`, `../` goes to root `/`
- Then it looks for `/utils/jwt.js` (doesn't exist!)
- Should use `./` to stay in `api/` and go into `utils/`

---

## ✅ FIXES REQUIRED

### Fix 1: Update `api/login.js`

**File:** `api/login.js`  
**Line:** 8

**Find:**
```javascript
import { generateToken } from '../utils/jwt.js';
```

**Replace with:**
```javascript
import { generateToken } from './utils/jwt.js';
```

---

### Fix 2: Update `api/register.js`

**File:** `api/register.js`  
**Line:** 8

**Find:**
```javascript
import { generateToken } from '../utils/jwt.js';
```

**Replace with:**
```javascript
import { generateToken } from './utils/jwt.js';
```

---

### Fix 3: Update `api/profile.js`

**File:** `api/profile.js`  
**Line:** 8

**Find:**
```javascript
import { verifyToken, extractToken } from '../utils/jwt.js';
```

**Replace with:**
```javascript
import { verifyToken, extractToken } from './utils/jwt.js';
```

---

## ✅ FILES ALREADY CORRECT

These files already use the correct path (no changes needed):
- ✅ `api/admin.js` - Uses `./utils/jwt.js` ✅
- ✅ `api/auth.js` - Uses `./utils/jwt.js` ✅

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Fix Import Paths (3 files)
- [ ] `api/login.js` line 8: Change `../utils/jwt.js` → `./utils/jwt.js`
- [ ] `api/register.js` line 8: Change `../utils/jwt.js` → `./utils/jwt.js`
- [ ] `api/profile.js` line 8: Change `../utils/jwt.js` → `./utils/jwt.js`

### Step 2: Verify Changes
- [ ] All imports use `./utils/jwt.js` (not `../utils/jwt.js`)
- [ ] No typos in import statements

### Step 3: Deploy and Test
- [ ] Commit changes to Git
- [ ] Push to repository
- [ ] Vercel auto-deploys
- [ ] Check Vercel logs - no import errors
- [ ] Test login functionality
- [ ] Test registration functionality

---

## 🎯 WHAT'S CHANGING

**Before:**
- ❌ `import { generateToken } from '../utils/jwt.js';` (wrong path)

**After:**
- ✅ `import { generateToken } from './utils/jwt.js';` (correct path)

**The Change:**
- Only change: `../` → `./`
- Everything else stays the same

---

## 🔧 EXACT CODE CHANGES

### File 1: `api/login.js`
**Line 8:**
```diff
- import { generateToken } from '../utils/jwt.js';
+ import { generateToken } from './utils/jwt.js';
```

### File 2: `api/register.js`
**Line 8:**
```diff
- import { generateToken } from '../utils/jwt.js';
+ import { generateToken } from './utils/jwt.js';
```

### File 3: `api/profile.js`
**Line 8:**
```diff
- import { verifyToken, extractToken } from '../utils/jwt.js';
+ import { verifyToken, extractToken } from './utils/jwt.js';
```

---

## ✅ EXPECTED RESULT

After fixes:
1. ✅ Module import error resolved
2. ✅ Files can find `jwt.js` correctly
3. ✅ Login works
4. ✅ Registration works
5. ✅ No "Cannot find module" errors in Vercel logs

---

## 🚨 IMPORTANT NOTES

1. **Exact Match:**
   - Change only `../` to `./`
   - Keep `.js` extension
   - Case-sensitive

2. **File Location:**
   - `jwt.js` is at: `api/utils/jwt.js` ✅ (correct location)
   - No need to move file
   - Just fix import paths

3. **Why This Works:**
   - `./` = current directory (`api/`)
   - `./utils/` = subdirectory inside `api/`
   - `./utils/jwt.js` = correct path to the file

---

## 📊 SUMMARY

**Total Files to Fix:** 3  
**Total Lines to Change:** 3  
**Change:** `../` → `./` (one character difference!)  
**Complexity:** Simple (just path correction)

---

**STATUS: READY FOR IMPLEMENTATION** ✅

**This will fix the "Cannot find module" error** ✅
