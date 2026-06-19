import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

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
