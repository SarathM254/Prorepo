# AI Agent Execution Guide - Restoration Plan

## ✅ PLAN READINESS CHECK

**Status:** ✅ **READY FOR EXECUTION**

**Credentials Required:** ❌ **NONE** - All environment variables are already configured in Vercel

---

## 📋 EXECUTION SUMMARY

### What Needs to Be Done:

1. **Fix merge conflict** in `api/auth/status.js` (URGENT - blocks deployment)
2. **Restore email/password login form** in `login.html` and `js/auth/login.js`
3. **Add CSS styles** for login form in `css/auth.css`

### What Does NOT Need to Be Done:

- ❌ No environment variables to set (already in Vercel)
- ❌ No credentials to configure (MongoDB, Cloudinary, Google OAuth already set)
- ❌ No database changes needed
- ❌ No super admin changes needed (protection already exists)

---

## 🔧 EXECUTION STEPS FOR AI AGENT

### Step 1: Fix Merge Conflict (CRITICAL - Do First)

**File:** `api/auth/status.js`

**Action:**
1. Read the file and locate lines 84-150
2. Remove ALL merge conflict markers:
   - `<<<<<<< HEAD`
   - `=======`
   - `>>>>>>> parent of eaf0c1a`
3. Replace lines 84-150 with the corrected code from RESTORATION_PLAN.md (Priority 1, lines 36-92)
4. Also remove the unreachable code after the try-catch (lines 151-168) - it's dead code

**Verification:**
- File should have NO merge conflict markers
- JavaScript syntax should be valid
- File should end at line ~127 (after the catch block)

---

### Step 2: Restore Email/Password Login Form

**Files to Update:**
1. `login.html` - Add email/password form
2. `js/auth/login.js` - Add login functions
3. `css/auth.css` - Add form styles

**Action:**
1. Follow RESTORATION_PLAN.md Priority 2 section
2. Replace entire `login.html` with the new HTML structure provided
3. Add the new JavaScript functions to `js/auth/login.js` (append to existing file, don't replace)
4. Add the new CSS styles to `css/auth.css` (append to existing file)

---

### Step 3: Verify Changes

**Check:**
- [ ] `api/auth/status.js` has no merge conflict markers
- [ ] `login.html` has email/password form
- [ ] `js/auth/login.js` has login functions
- [ ] `css/auth.css` has form styles

---

## ⚠️ IMPORTANT NOTES FOR AGENT

### File Modification Rules:

1. **api/auth/status.js:**
   - Keep lines 1-83 exactly as they are
   - Replace lines 84-150 with corrected code
   - DELETE lines 151-168 (unreachable dead code after return statement)

2. **login.html:**
   - Replace entire file content with new structure
   - Keep the redirect script at top (lines 15-23)
   - Add toggle buttons for email/Google login

3. **js/auth/login.js:**
   - Keep existing functions (checkAuthStatus, handleGoogleLogin, showError)
   - ADD new functions (login, setupFormToggle, setupPasswordToggle, clearErrors)
   - UPDATE DOMContentLoaded event listener

4. **css/auth.css:**
   - Keep existing styles
   - ADD new styles at the end of file

---

## 🔍 CODE LOCATIONS IN PLAN

All exact code is provided in `RESTORATION_PLAN.md`:

- **Merge Conflict Fix:** Lines 36-92 of Priority 1 section
- **login.html:** Complete HTML structure in Priority 2 section
- **js/auth/login.js:** All functions in Priority 2 section
- **css/auth.css:** All styles in Priority 2 section

---

## ✅ NO EXTERNAL DEPENDENCIES

**The agent does NOT need:**
- MongoDB connection string (already in Vercel env)
- Cloudinary credentials (already in Vercel env)
- Google OAuth credentials (already in Vercel env)
- JWT secret (already in Vercel env)
- Any API keys or secrets

**Everything is configured in Vercel environment variables.**

---

## 📝 FINAL CHECKLIST BEFORE EXECUTION

- [ ] Read RESTORATION_PLAN.md completely
- [ ] Understand the merge conflict fix
- [ ] Understand the login form restoration
- [ ] All code is provided in the plan
- [ ] No credentials are needed
- [ ] Ready to modify files as specified

---

## 🚀 EXECUTION ORDER

1. **First:** Fix merge conflict (`api/auth/status.js`)
2. **Second:** Restore login form (`login.html`)
3. **Third:** Add login functions (`js/auth/login.js`)
4. **Fourth:** Add CSS styles (`css/auth.css`)

---

## ✅ SUCCESS CRITERIA

After execution:
- ✅ Deployment will succeed (no syntax errors)
- ✅ Login page has both email and Google login options
- ✅ Users can login with email/password
- ✅ Users can login with Google
- ✅ No merge conflict markers in code
- ✅ All files have valid syntax

---

## 📞 IF ISSUES OCCUR

If the agent encounters problems:
1. Check file syntax errors
2. Verify merge conflict markers are completely removed
3. Ensure code formatting is correct
4. Verify all opening/closing braces match

---

**STATUS: PLAN IS COMPLETE AND READY FOR AI AGENT EXECUTION** ✅

**NO CREDENTIALS NEEDED** ✅

