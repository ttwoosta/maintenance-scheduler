/**
 * Firebase bootstrap — COPY THIS FILE TO `firebase.ts` AND FILL IN YOUR CONFIG.
 *
 * The real `src/app/firebase.ts` is git-ignored (it holds project credentials),
 * so the repo ships this template instead. Every other module imports the
 * three exports below:
 *
 *   import { auth, db, storage } from '../firebase';
 *
 * Get these values from the Firebase console → Project settings → "Your apps".
 */
import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';
import { getStorage, connectStorageEmulator } from 'firebase/storage';

const firebaseConfig = {
  apiKey: 'YOUR_API_KEY',
  authDomain: 'rental-manager-bc6ba.firebaseapp.com',
  projectId: 'rental-manager-bc6ba',
  storageBucket: 'rental-manager-bc6ba.appspot.com',
  messagingSenderId: 'YOUR_SENDER_ID',
  appId: 'YOUR_APP_ID',
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
// Firestore uses the named database declared in firebase.json ("dev-maintenance-scheduler").
export const db = getFirestore(app, 'dev-maintenance-scheduler');
export const storage = getStorage(app);

// --- Local emulators (ports come from firebase.json) -----------------------
// Uncomment to point the app at `npm run emulators:start` instead of the cloud.
// if (location.hostname === 'localhost') {
//   connectAuthEmulator(auth, 'http://localhost:9099', { disableWarnings: true });
//   connectFirestoreEmulator(db, 'localhost', 9000);
//   connectStorageEmulator(storage, 'localhost', 9199);
// }
