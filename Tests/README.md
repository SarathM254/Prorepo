# Proto Tests

This folder contains test files for the Proto application.

## Files

### Connection Test
- **`connection-test.html`** - HTML interface for testing backend connectivity
- **`connection-test.js`** - JavaScript test functions
- **`test-styles.css`** - Styling for test pages

## Running Tests

### Backend Connection Test
1. Make sure the backend server is running:
   ```bash
   cd backend
   npm start
   ```

2. Open the test page:
   ```
   Tests/connection-test.html
   ```

3. Click the test buttons to verify:
   - Backend server is accessible
   - Login functionality works
   - Authentication status is correct

## Test Functions

### `testConnection()`
Tests if the backend `/api/health` endpoint is responding.

### `testLogin()`
Tests login with demo credentials:
- Email: `admin@proto.com`
- Password: `admin123`

### `testAuthStatus()`
Tests the authentication status endpoint to verify if user is logged in.

### `runAllTests()`
Runs all tests in sequence.

### `clearResults()`
Clears the test results display.

## Adding New Tests

To add new tests:

1. Add test functions to `connection-test.js`
2. Add corresponding buttons to `connection-test.html`
3. Follow the existing pattern for consistency

## Test Results

Test results are color-coded:
- 🔵 **Blue (Loading)** - Test is running or informational message
- 🟢 **Green (Success)** - Test passed
- 🔴 **Red (Error)** - Test failed

---

**Note**: These are frontend integration tests. For unit tests, consider adding a proper testing framework like Jest or Mocha.

