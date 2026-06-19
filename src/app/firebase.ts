import { initializeApp } from 'firebase/app';
import { connectFirestoreEmulator, getFirestore } from 'firebase/firestore';
import { connectAuthEmulator, getAuth } from 'firebase/auth';

// TODO: Replace placeholder values with your Firebase project config.
// Firebase console → Project settings → Your apps → SDK setup and configuration
const firebaseConfig = {
  apiKey: "AIzaSyCX6EQTgf9Ls-G1qKhr5iLlR_xzB4bP7dg",
  authDomain: "rental-manager-bc6ba.firebaseapp.com",
  projectId: "rental-manager-bc6ba",
  storageBucket: "rental-manager-bc6ba.firebasestorage.app",
  messagingSenderId: "447954650885",
  appId: "1:447954650885:web:487c2af34467fb2650d96c",
  measurementId: "G-607V78T9GK"
};

export const firebaseApp = initializeApp(firebaseConfig);
export const db = getFirestore(firebaseApp, 'dev-maintenance-scheduler');
export const auth = getAuth(firebaseApp);

const isLocalDevelopment =
  typeof window !== 'undefined' && ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname);

if (isLocalDevelopment) {
  connectFirestoreEmulator(db, '127.0.0.1', 9000);
  // disableWarnings suppresses the "running against emulator" banner in console
  connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: false });
}
