/* global auth */
// Deprecated local auth shim.
// The labs page uses Firebase Auth via firebase-auth.js.

function checkAuthentication() {
    console.warn('labs-auth.js is deprecated. Firebase Auth handles sessions.');
}

function handleLogin(event) {
    event.preventDefault();
    console.warn('labs-auth.js is deprecated. Use firebase-auth.js instead.');
}

function logout() {
    if (typeof auth !== 'undefined' && auth.signOut) {
        return auth.signOut();
    }
    console.warn('labs-auth.js is deprecated and no auth provider is available.');
    return Promise.resolve();
}
