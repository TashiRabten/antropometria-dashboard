// Firebase Configuration — TEMPLATE
// Copy this file to firebase-config.js and fill in your project values.
// firebase-config.js is gitignored — do NOT commit it.

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.firebasestorage.app",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID",
  measurementId: "YOUR_MEASUREMENT_ID"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('⚠️ Múltiplas abas abertas, persistência desabilitada');
        } else if (err.code == 'unimplemented') {
            console.warn('⚠️ Navegador não suporta persistência offline');
        }
    });

console.log('🔥 Firebase inicializado');
