# Final Server Error Correction Plan

## 🔴 CRITICAL ISSUE IDENTIFIED

**Problem:** Users still seeing "Server error. Please try again later." message

**Root Causes Found:**
1. ❌ **No top-level error handler** - Errors outside try-catch return HTML pages
2. ❌ **Response sent twice** - Can cause "Cannot set headers" errors
3. ❌ **JWT token generation errors** - Not caught if JWT_SECRET is missing
4. ❌ **Unhandled promise rejections** - Can cause HTML error pages
5. ❌ **Content-Type not set early** - Vercel might return HTML before JSON header

---

## 🔍 CURRENT CODE ISSUES

### Issue 1: Handler Not Fully Wrapped
The handler function has try-catch inside, but errors during CORS setup or early validation might not be caught.

### Issue 2: JWT Generation Not Protected
If `generateToken()` fails (missing JWT_SECRET), error might not be caught properly.

### Issue 3: Response Headers Timing
If error occurs after response started, cannot set headers again.

### Issue 4: No Response Guarantee
Handler doesn't guarantee a response is always sent.

---

## ✅ COMPREHENSIVE SOLUTION

### Priority 1: Wrap Entire Handler in Try-Catch

#### Fix 1.1: Update `api/login.js` with Complete Error Handling

**File:** `api/login.js`

**Replace the entire `export default async function handler` section (lines 65-220):**

```javascript
export default async function handler(req, res) {
  // Track if response has been sent
  let responseSent = false;
  
  // Helper function to send JSON response safely
  const sendJSON = (status, data) => {
    if (responseSent) {
      console.error('Attempted to send response twice:', data);
      return;
    }
    responseSent = true;
    
    // Always set Content-Type header
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);
  };

  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
      return sendJSON(200, { success: true });
    }

    if (req.method !== 'POST') {
      return sendJSON(405, { 
        success: false,
        error: 'Method not allowed' 
      });
    }

    // Validate request body exists
    if (!req.body) {
      return sendJSON(400, {
        success: false,
        error: 'Request body is required'
      });
    }

    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return sendJSON(400, {
        success: false,
        error: 'Email and password are required'
      });
    }

    // Validate email format (basic check)
    if (typeof email !== 'string' || !email.includes('@')) {
      return sendJSON(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password type
    if (typeof password !== 'string' || password.length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Password is required'
      });
    }

    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Find user by email
      const normalizedEmail = email.toLowerCase().trim();
      const user = await usersCollection.findOne({ email: normalizedEmail });

      if (!user) {
        return sendJSON(404, {
          success: false,
          error: 'Invalid email'
        });
      }

      // Check if user has a password (Google users might not have one)
      if (!user.password) {
        return sendJSON(400, {
          success: false,
          error: 'This account was created with Google. Please use "Continue with Google" to login, or set a password in your profile settings.',
          requiresGoogleLogin: true
        });
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);

      if (!isValidPassword) {
        return sendJSON(401, {
          success: false,
          error: 'Password is wrong'
        });
      }

      // Check if this is super admin email and update if needed
      const isSuperAdminEmail = normalizedEmail === 'motupallisarathchandra@gmail.com';
      let isSuperAdmin = user.isSuperAdmin || false;
      
      // If email matches super admin but DB doesn't have the flag, update it
      if (isSuperAdminEmail && !user.isSuperAdmin) {
        await usersCollection.updateOne(
          { _id: user._id },
          { $set: { isSuperAdmin: true } }
        );
        isSuperAdmin = true;
      }

      // Generate JWT token (wrap in try-catch)
      let token;
      try {
        const userResponse = {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdmin
        };
        token = generateToken(userResponse);
      } catch (tokenError) {
        console.error('JWT token generation failed:', tokenError);
        return sendJSON(500, {
          success: false,
          error: 'Authentication error. Please try again.'
        });
      }

      return sendJSON(200, {
        success: true,
        user: {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          isSuperAdmin: isSuperAdmin
        },
        token: token,
        message: 'Login successful'
      });
    } catch (dbError) {
      // Log the full error for debugging (server-side only)
      console.error('Login database error:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
        timestamp: new Date().toISOString()
      });

      // Handle specific error types
      if (dbError.message && dbError.message.includes('MONGODB_URI')) {
        return sendJSON(500, {
          success: false,
          error: 'Database configuration error. Please contact support.'
        });
      }

      if (dbError.message && (dbError.message.includes('connect') || dbError.message.includes('Database connection failed'))) {
        return sendJSON(503, {
          success: false,
          error: 'Unable to connect to database. Please try again in a moment.'
        });
      }

      // Generic error - don't expose internal details to users
      return sendJSON(500, {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('Login handler error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // Only send response if not already sent
    if (!responseSent) {
      try {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        });
      } catch (sendError) {
        console.error('Failed to send error response:', sendError);
      }
    }
  }
}
```

---

#### Fix 1.2: Update `api/register.js` with Same Pattern

**File:** `api/register.js`

**Apply the same pattern - wrap entire handler in try-catch with response tracking:**

```javascript
export default async function handler(req, res) {
  // Track if response has been sent
  let responseSent = false;
  
  // Helper function to send JSON response safely
  const sendJSON = (status, data) => {
    if (responseSent) {
      console.error('Attempted to send response twice:', data);
      return;
    }
    responseSent = true;
    
    // Always set Content-Type header
    res.setHeader('Content-Type', 'application/json');
    return res.status(status).json(data);
  };

  try {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version');

    if (req.method === 'OPTIONS') {
      return sendJSON(200, { success: true });
    }

    if (req.method !== 'POST') {
      return sendJSON(405, { 
        success: false,
        error: 'Method not allowed' 
      });
    }

    // Validate request body exists
    if (!req.body) {
      return sendJSON(400, {
        success: false,
        error: 'Request body is required'
      });
    }

    const { name, email, password } = req.body;

    // Validate required fields
    if (!name || !email || !password) {
      return sendJSON(400, {
        success: false,
        error: 'Name, email, and password are required'
      });
    }

    // Validate field types
    if (typeof name !== 'string' || name.trim().length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Name is required'
      });
    }

    // Validate email format (basic check)
    if (typeof email !== 'string' || !email.includes('@')) {
      return sendJSON(400, {
        success: false,
        error: 'Invalid email format'
      });
    }

    // Validate password type and length
    if (typeof password !== 'string' || password.length === 0) {
      return sendJSON(400, {
        success: false,
        error: 'Password is required'
      });
    }

    if (password.length < 6) {
      return sendJSON(400, {
        success: false,
        error: 'Password must be at least 6 characters long'
      });
    }

    // Validate environment variables
    if (!process.env.MONGODB_URI) {
      console.error('MONGODB_URI is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured');
      return sendJSON(500, {
        success: false,
        error: 'Server configuration error. Please contact support.'
      });
    }

    try {
      const { db } = await connectToDatabase();
      const usersCollection = db.collection('users');

      // Validate email format with regex
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return sendJSON(400, {
          success: false,
          error: 'Invalid email format'
        });
      }

      // Check if email already exists
      const existingUser = await usersCollection.findOne({ email: email.toLowerCase() });
      if (existingUser) {
        return sendJSON(409, {
          success: false,
          error: 'This email already exists'
        });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create new user with isSuperAdmin field
      const normalizedEmail = email.toLowerCase().trim();
      const newUser = {
        name: name.trim(),
        email: normalizedEmail,
        password: hashedPassword,
        created_at: new Date(),
        isSuperAdmin: normalizedEmail === 'motupallisarathchandra@gmail.com'
      };

      const result = await usersCollection.insertOne(newUser);

      // Generate JWT token (wrap in try-catch)
      let token;
      try {
        const userResponse = {
          id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
          isSuperAdmin: newUser.isSuperAdmin || false
        };
        token = generateToken(userResponse);
      } catch (tokenError) {
        console.error('JWT token generation failed:', tokenError);
        return sendJSON(500, {
          success: false,
          error: 'Authentication error. Please try again.'
        });
      }

      return sendJSON(201, {
        success: true,
        user: {
          id: result.insertedId.toString(),
          name: newUser.name,
          email: newUser.email,
          isSuperAdmin: newUser.isSuperAdmin || false
        },
        token: token,
        message: 'Registration successful'
      });
    } catch (dbError) {
      // Log the full error for debugging (server-side only)
      console.error('Registration database error:', {
        message: dbError.message,
        stack: dbError.stack,
        name: dbError.name,
        timestamp: new Date().toISOString(),
        email: email ? email.toLowerCase() : 'N/A'
      });

      // Handle specific error types
      if (dbError.message && dbError.message.includes('MONGODB_URI')) {
        return sendJSON(500, {
          success: false,
          error: 'Database configuration error. Please contact support.'
        });
      }

      if (dbError.message && (dbError.message.includes('connect') || dbError.message.includes('Database connection failed'))) {
        return sendJSON(503, {
          success: false,
          error: 'Unable to connect to database. Please try again in a moment.'
        });
      }

      // Handle duplicate key errors (MongoDB)
      if (dbError.code === 11000 || dbError.message.includes('duplicate key')) {
        return sendJSON(409, {
          success: false,
          error: 'This email already exists'
        });
      }

      // Generic error - don't expose internal details to users
      return sendJSON(500, {
        success: false,
        error: 'An unexpected error occurred. Please try again.'
      });
    }
  } catch (error) {
    // Catch-all for any unexpected errors
    console.error('Registration handler error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      timestamp: new Date().toISOString()
    });

    // Only send response if not already sent
    if (!responseSent) {
      try {
        res.setHeader('Content-Type', 'application/json');
        return res.status(500).json({
          success: false,
          error: 'An unexpected error occurred. Please try again.'
        });
      } catch (sendError) {
        console.error('Failed to send error response:', sendError);
      }
    }
  }
}
```

---

### Priority 2: Improve Frontend Error Handling

#### Fix 2.1: Better Error Catching in Frontend

**File:** `js/auth/login.js`

**Update the login function to handle JSON parsing errors better (around lines 160-167):**

```javascript
// Check if response is JSON before parsing
const contentType = response.headers.get('content-type');
let data;

try {
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    data = JSON.parse(text);
  } else {
    // Response is not JSON - likely an error page
    const text = await response.text();
    console.error('Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType: contentType,
      preview: text.substring(0, 200)
    });
    throw new Error('Server error: Invalid response format. Please try again.');
  }
} catch (parseError) {
  // If JSON parsing fails or response is not JSON
  console.error('Response parsing error:', parseError);
  throw new Error('Server error: Invalid response format. Please try again.');
}
```

**Apply same change to register function (around lines 388-394):**

```javascript
// Check if response is JSON before parsing
const contentType = response.headers.get('content-type');
let data;

try {
  if (contentType && contentType.includes('application/json')) {
    const text = await response.text();
    data = JSON.parse(text);
  } else {
    // Response is not JSON - likely an error page
    const text = await response.text();
    console.error('Non-JSON response received:', {
      status: response.status,
      statusText: response.statusText,
      contentType: contentType,
      preview: text.substring(0, 200)
    });
    throw new Error('Server error: Invalid response format. Please try again.');
  }
} catch (parseError) {
  // If JSON parsing fails or response is not JSON
  console.error('Response parsing error:', parseError);
  throw new Error('Server error: Invalid response format. Please try again.');
}
```

---

### Priority 3: Add JWT Secret Validation

#### Fix 3.1: Check JWT_SECRET in JWT Utility

**File:** `api/utils/jwt.js`

**Update generateToken to handle missing secret:**

```javascript
export function generateToken(user) {
  const JWT_SECRET = process.env.JWT_SECRET;
  
  if (!JWT_SECRET || JWT_SECRET === 'your-secret-key-change-in-production') {
    throw new Error('JWT_SECRET is not properly configured');
  }
  
  const payload = {
    id: user.id || user._id?.toString(),
    email: user.email,
    name: user.name,
    isSuperAdmin: user.isSuperAdmin || false
  };

  try {
    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    });
  } catch (error) {
    throw new Error(`JWT token generation failed: ${error.message}`);
  }
}
```

---

## 📋 IMPLEMENTATION CHECKLIST

### Step 1: Update API Files with Complete Error Handling
- [ ] Update `api/login.js` - Add response tracking and wrap entire handler
- [ ] Update `api/register.js` - Add response tracking and wrap entire handler
- [ ] Update `api/utils/jwt.js` - Add JWT_SECRET validation

### Step 2: Improve Frontend Error Parsing
- [ ] Update `login()` function - Better JSON parsing with try-catch
- [ ] Update `register()` function - Better JSON parsing with try-catch

### Step 3: Test All Error Scenarios
- [ ] Test with missing JWT_SECRET
- [ ] Test with missing MONGODB_URI
- [ ] Test with invalid JSON responses
- [ ] Test with network errors
- [ ] Test with database connection failures
- [ ] Verify all errors return JSON (never HTML)

---

## 🎯 KEY IMPROVEMENTS

### 1. Response Tracking
- ✅ Prevents "Cannot set headers after sent" errors
- ✅ Ensures only one response is sent

### 2. Complete Error Wrapping
- ✅ All errors caught at handler level
- ✅ Always returns JSON (never HTML)

### 3. JWT Error Handling
- ✅ Validates JWT_SECRET exists
- ✅ Catches token generation errors

### 4. Better JSON Parsing
- ✅ Frontend handles parsing errors gracefully
- ✅ Logs detailed error info for debugging

### 5. Content-Type Guarantee
- ✅ Always sets Content-Type: application/json
- ✅ Prevents Vercel from returning HTML

---

## 🚨 CRITICAL CHANGES

1. **sendJSON helper function** - Prevents double responses
2. **Response tracking flag** - Ensures response sent only once
3. **Outer try-catch** - Catches all unexpected errors
4. **JWT validation** - Checks secret before token generation
5. **Better parsing** - Frontend handles non-JSON responses

---

## ✅ EXPECTED RESULT

**After fixes:**
- ✅ All errors return JSON (never HTML error pages)
- ✅ No "Cannot set headers" errors
- ✅ User-friendly error messages always displayed
- ✅ Detailed error logs for debugging
- ✅ Graceful handling of all error scenarios

---

**STATUS: COMPREHENSIVE FIX READY FOR IMPLEMENTATION** ✅

