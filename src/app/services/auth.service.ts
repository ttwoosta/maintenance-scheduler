import { Injectable, signal, computed } from '@angular/core';
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { auth } from '../firebase';

@Injectable({ providedIn: 'root' })
export class AuthService {
  /** The currently signed-in user, or null when signed out. */
  readonly user = signal<User | null>(null);

  /**
   * Becomes true once the first `onAuthStateChanged` callback fires.
   * Guards should wait for this before deciding to allow/block navigation,
   * so a page refresh never flickers to /login for an already-signed-in user.
   */
  readonly initialized = signal(false);

  readonly isAuthenticated = computed(() => !!this.user());

  constructor() {
    onAuthStateChanged(auth, (u) => {
      this.user.set(u);
      this.initialized.set(true);
    });
  }

  signIn(email: string, password: string) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  signUp(email: string, password: string) {
    return createUserWithEmailAndPassword(auth, email, password);
  }

  signOut() {
    return signOut(auth);
  }
}
