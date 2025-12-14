// Labs Authentication System
// Simple client-side authentication for personal use

// Credentials (hardcoded for personal dashboard)
const VALID_CREDENTIALS = {
    username: 'Julia Barichello',
    password: 'Turtle'
};

// Session key
const SESSION_KEY = 'labs_authenticated';
let authInitialized = false;
let labsScanned = false; // Flag to track if labs have been scanned

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    if (!authInitialized) {
        authInitialized = true;
        checkAuthentication();
    }
});

// Check if user is authenticated
function checkAuthentication() {
    const isAuthenticated = sessionStorage.getItem(SESSION_KEY) === 'true';

    if (isAuthenticated) {
        showMainContent();
    } else {
        showLoginScreen();
    }
}

// Handle login form submission
function handleLogin(event) {
    event.preventDefault();

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('login-error');

    // Validate credentials
    if (username === VALID_CREDENTIALS.username && password === VALID_CREDENTIALS.password) {
        // Set session
        sessionStorage.setItem(SESSION_KEY, 'true');

        // Hide error if showing
        errorDiv.style.display = 'none';

        // Show main content (will trigger scanLabFiles internally)
        showMainContent();
    } else {
        // Show error
        errorDiv.style.display = 'block';

        // Clear password field
        document.getElementById('password').value = '';
    }
}

// Show login screen
function showLoginScreen() {
    document.getElementById('login-screen').style.display = 'block';
    document.getElementById('main-content').style.display = 'none';
    document.getElementById('logout-nav').style.display = 'none';
}

// Show main content
function showMainContent() {
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('main-content').style.display = 'block';
    document.getElementById('logout-nav').style.display = 'block';

    // Only scan labs once per session
    if (!labsScanned && typeof scanLabFiles === 'function') {
        labsScanned = true;
        console.log('🔐 Autenticado - iniciando scan de exames');
        scanLabFiles();
    }
}

// Logout function
function logout() {
    // Clear session
    sessionStorage.removeItem(SESSION_KEY);

    // Reset labs scanned flag
    labsScanned = false;

    // Clear form fields
    document.getElementById('username').value = '';
    document.getElementById('password').value = '';

    // Show login screen
    showLoginScreen();
}

// Check session on page visibility change (e.g., returning to tab)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        checkAuthentication();
    }
});
