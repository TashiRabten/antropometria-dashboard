/* global auth, db, firebase, scanLabFiles */
// Firebase Authentication Module
// Replaces labs-auth.js with Firebase Auth

// Current user
let currentUser = null;

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    console.log('🔐 Inicializando autenticação Firebase...');

    // Listen for auth state changes
    auth.onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            console.log('✅ Usuário autenticado:', user.email);
            console.log('👤 User ID:', user.uid);

            // Hide login screen, show main content
            showMainContent();

            // IMPORTANTE: Só chamar scanLabFiles AQUI, depois de confirmar auth
            // E só chamar UMA VEZ por sessão
            if (typeof scanLabFiles === 'function' && !window.labsScanned) {
                console.log('📊 Carregando labs após autenticação...');
                window.labsScanned = true; // Flag global para evitar múltiplas chamadas
                scanLabFiles();
            }
        } else {
            // User is signed out
            currentUser = null;
            console.log('🔒 Usuário não autenticado');

            // Show login screen
            showLoginScreen();
        }
    });
});

// Sign in with email and password
async function handleLogin(event) {
    event.preventDefault();

    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');
    const errorDiv = document.getElementById('login-error');

    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    // Hide previous errors
    errorDiv.style.display = 'none';

    try {
        // Map username to email
        const email = mapUsernameToEmail(username);

        console.log('🔑 Tentando login:', email);

        // Sign in with Firebase Auth
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        const user = userCredential.user;

        console.log('✅ Login bem-sucedido:', user.email);

        // Auth state listener will handle the rest (showMainContent + scanLabFiles)
        // NÃO chamar scanLabFiles aqui - deixar o onAuthStateChanged fazer isso

    } catch (error) {
        console.error('❌ Erro no login:', error.code, error.message);

        // Show user-friendly error message
        let errorMessage = 'Credenciais inválidas. Tente novamente.';

        if (error.code === 'auth/user-not-found') {
            errorMessage = 'Usuário não encontrado. Verifique o nome de usuário.';
        } else if (error.code === 'auth/wrong-password') {
            errorMessage = 'Senha incorreta.';
        } else if (error.code === 'auth/too-many-requests') {
            errorMessage = 'Muitas tentativas. Aguarde alguns minutos.';
        } else if (error.code === 'auth/network-request-failed') {
            errorMessage = 'Erro de conexão. Verifique sua internet.';
        }

        errorDiv.textContent = errorMessage;
        errorDiv.style.display = 'block';
    }
}

// Sign out
async function logout() {
    try {
        await auth.signOut();
        console.log('👋 Usuário desconectado');
        
        // Reset flag para permitir novo scan após login
        window.labsScanned = false;

        // Auth state listener will handle showing login screen

    } catch (error) {
        console.error('❌ Erro ao desconectar:', error);
        alert('Erro ao sair. Tente novamente.');
    }
}

// Map username to email
function mapUsernameToEmail(username) {
    // Normalize username (remove extra spaces, lowercase)
    const normalized = username.toLowerCase().trim();

    // Known mappings
    const userMap = {
        'julia barichello': 'julia@antropometria.com',
        'julia': 'julia@antropometria.com',
        'natalia medina': 'natalia@antropometria.com',
        'natalia': 'natalia@antropometria.com',
        'aasta': 'aasta@antropometria.com'
    };

    // If username is already an email, use it directly
    if (username.includes('@')) {
        return username.toLowerCase();
    }

    // Otherwise, use mapping
    return Object.prototype.hasOwnProperty.call(userMap, normalized)
        ? Object.getOwnPropertyDescriptor(userMap, normalized).value
        : `${normalized.replace(/\s+/g, '')}@antropometria.com`;
}

// Get the data owner ID - every account reads the same shared records.
//
// This used to keep an e-mail allowlist here and fall back to the signed-in
// user's own UID. That failed badly in two ways: an address missing from the
// list read an empty path and rendered an empty dashboard, which looks exactly
// like a loading failure; and the list decided nothing anyway, since the
// Firestore rules are what actually grant access. Who may read the records is
// now decided only in the rules, and the client simply always asks for them.
function getDataOwnerId() {
    // UID owning the shared records (originally Julia's account)
    const SHARED_DATA_UID = 'V1dJnjgqdwQ512Fu5eqZvpkXsr13';

    if (!currentUser) return null;

    console.log(`🔗 ${currentUser.email} → dados compartilhados (${SHARED_DATA_UID})`);
    return SHARED_DATA_UID;
}

// Show login screen
function showLoginScreen() {
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const logoutNav = document.getElementById('logout-nav');

    if (loginScreen) loginScreen.style.display = 'flex';
    if (mainContent) mainContent.style.display = 'none';
    if (logoutNav) logoutNav.style.display = 'none';
}

// Show main content (after successful login)
function showMainContent() {
    const loginScreen = document.getElementById('login-screen');
    const mainContent = document.getElementById('main-content');
    const logoutNav = document.getElementById('logout-nav');

    if (loginScreen) loginScreen.style.display = 'none';
    if (mainContent) mainContent.style.display = 'block';
    if (logoutNav) logoutNav.style.display = 'block';
}

// Get current user ID (uses shared data owner ID for linked users)
function getCurrentUserId() {
    return getDataOwnerId();
}

// Get actual Firebase UID (for Firebase Auth operations only)
function getActualUserId() {
    return currentUser ? currentUser.uid : null;
}

// Get current user email
function getCurrentUserEmail() {
    return currentUser ? currentUser.email : null;
}

// Helper function to create initial user account
async function createInitialUser(email, password, displayName) {
    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        await user.updateProfile({
            displayName: displayName
        });

        await db.collection('users').doc(user.uid).set({
            email: email,
            displayName: displayName,
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        console.log('✅ Usuário criado:', email);
        return user;
    } catch (error) {
        console.error('❌ Erro ao criar usuário:', error);
        throw error;
    }
}

// Export functions for use in other files
window.firebaseAuth = {
    handleLogin,
    logout,
    getCurrentUserId,
    getActualUserId,
    getDataOwnerId,
    getCurrentUserEmail,
    createInitialUser,
    get currentUser() { return currentUser; }
};
