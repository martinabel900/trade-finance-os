import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  type AuthError,
  type User,
  type UserCredential,
} from 'firebase/auth';
import { auth } from '../firebase/firebase';

function getAuthErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Firebase Authentication request failed.';
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  try {
    return await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw new Error(getAuthErrorMessage(error));
  }
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}

export function subscribeToAuth(
  onUserChanged: (user: User | null) => void,
  onError?: (error: AuthError) => void,
) {
  return onAuthStateChanged(auth, onUserChanged, onError);
}

export const logoutUser = logout;
export { auth };
