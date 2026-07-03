import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  type Timestamp,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';

export const DEFAULT_EMAIL_SIGNATURE = [
  'Trade Finance Company International',
  'martin@tradefinancecompanyinternational.com',
].join('\n');

export interface UserEmailSettings {
  signature: string;
  updatedAt?: Timestamp | null;
}

const USER_SETTINGS_COLLECTION = 'userSettings';

export async function getUserEmailSettings(): Promise<UserEmailSettings> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in to load email settings.');
  }

  const snapshot = await getDoc(doc(db, USER_SETTINGS_COLLECTION, user.uid));

  if (!snapshot.exists()) {
    return {
      signature: DEFAULT_EMAIL_SIGNATURE,
      updatedAt: null,
    };
  }

  const data = snapshot.data();

  return {
    signature: String(data.signature || DEFAULT_EMAIL_SIGNATURE),
    updatedAt: data.updatedAt ?? null,
  };
}

export async function saveUserEmailSettings(settings: Pick<UserEmailSettings, 'signature'>): Promise<void> {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You must be signed in to save email settings.');
  }

  await setDoc(
    doc(db, USER_SETTINGS_COLLECTION, user.uid),
    {
      signature: settings.signature.trim() || DEFAULT_EMAIL_SIGNATURE,
      updatedAt: serverTimestamp(),
    },
    { merge: true },
  );
}
