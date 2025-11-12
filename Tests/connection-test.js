/**
 * Connection Test Suite
 * Tests backend API connectivity and authentication
 */

const API_BASE = 'http://localhost:3000/api';

/**
 * Add result message to the results container
 * @param {string} message - The message to display
 * @param {string} type - The type of message (loading, success, error)
 */
function addResult(message, type = 'loading') {
    const results = document.getElementById('results');
    const div = document.createElement('div');
    div.className = `status ${type}`;
    div.innerHTML = `<strong>${new Date().toLocaleTimeString()}</strong>: ${message}`;
    results.appendChild(div);
}

/**
 * Test backend server health endpoint
 */
async function testConnection() {
    addResult('Testing backend connection...', 'loading');
    
    try {
        const response = await fetch(`${API_BASE}/health`);
        const data = await response.json();
        
        if (data.status === 'OK') {
            addResult('✅ Backend server is running!', 'success');
            addResult(`Server message: ${data.message}`, 'success');
        } else {
            addResult('❌ Backend responded but with unexpected data', 'error');
        }
    } catch (error) {
        addResult(`❌ Connection failed: ${error.message}`, 'error');
        addResult('Make sure the backend server is running on port 3000', 'error');
    }
}

/**
 * Test login functionality with demo credentials
 */
async function testLogin() {
    addResult('Testing login with demo credentials...', 'loading');
    
    try {
        const response = await fetch(`${API_BASE}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({
                email: 'admin@proto.com',
                password: 'admin123'
            })
        });
        
        const data = await response.json();
        
        if (data.success) {
            addResult('✅ Login successful!', 'success');
            addResult(`Welcome ${data.user.name}!`, 'success');
        } else {
            addResult(`❌ Login failed: ${data.error}`, 'error');
        }
    } catch (error) {
        addResult(`❌ Login test failed: ${error.message}`, 'error');
    }
}

/**
 * Test authentication status endpoint
 */
async function testAuthStatus() {
    addResult('Testing authentication status...', 'loading');
    
    try {
        const response = await fetch(`${API_BASE}/auth/status`);
        const data = await response.json();
        
        if (data.authenticated) {
            addResult('✅ User is authenticated', 'success');
            addResult(`User: ${data.user.name} (${data.user.email})`, 'success');
        } else {
            addResult('ℹ️ User is not authenticated', 'loading');
        }
    } catch (error) {
        addResult(`❌ Auth status test failed: ${error.message}`, 'error');
    }
}

/**
 * Clear all test results
 */
function clearResults() {
    const results = document.getElementById('results');
    results.innerHTML = '';
    addResult('Results cleared. Ready for new tests.', 'loading');
}

/**
 * Run all tests in sequence
 */
async function runAllTests() {
    clearResults();
    addResult('Running all tests...', 'loading');
    
    await testConnection();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testLogin();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    await testAuthStatus();
    
    addResult('All tests completed!', 'success');
}

// Auto-test on page load
window.addEventListener('load', () => {
    addResult('Page loaded. Click buttons to start testing.', 'loading');
});

