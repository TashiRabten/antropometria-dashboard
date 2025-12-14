// Firebase Configuration and Initialization
// Project: antropometria-dashboard-31a2c

const firebaseConfig = {
  apiKey: "AIzaSyCjdMQKg1Tc3WleG6ypgqb_s5vTAXZ3aT0",
  authDomain: "antropometria-dashboar.firebaseapp.com",
  projectId: "antropometria-dashboar",
  storageBucket: "antropometria-dashboar.firebasestorage.app",
  messagingSenderId: "835578192394",
  appId: "1:835578192394:web:990a1ed0726b38146735f3",
  measurementId: "G-MK2E35QW8V"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Export Firebase services for use in other files
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();

// Enable Firestore offline persistence
db.enablePersistence()
    .catch((err) => {
        if (err.code == 'failed-precondition') {
            console.warn('⚠️ Múltiplas abas abertas, persistência desabilitada');
        } else if (err.code == 'unimplemented') {
            console.warn('⚠️ Navegador não suporta persistência offline');
        }
    });

console.log('🔥 Firebase inicializado');
