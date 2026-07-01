import type { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  type DocumentData,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { db } from '../firebase/firebase';
import { getUserSignature } from '../utils/userAttribution';

export const USERS_COLLECTION = 'users';
export const USER_ROLES = ['admin', 'manager', 'user'] as const;
export const USER_STATUSES = ['active', 'inactive'] as const;

export type UserRole = (typeof USER_ROLES)[number];
export type UserStatus = (typeof USER_STATUSES)[number];

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  initials: string;
  role: UserRole;
  status: UserStatus;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdByUid: string;
  updatedByUid: string;
}

const usersRef = collection(db, USERS_COLLECTION);

export async function getOrCreateUserProfile(user: User): Promise<UserProfile> {
  const profileRef = doc(db, USERS_COLLECTION, user.uid);
  const snapshot = await getDoc(profileRef);

  if (snapshot.exists()) {
    const profile = userProfileFromSnapshot(snapshot);

    if (isBootstrapAdminEmail(user.email) && (profile.role !== 'admin' || profile.status !== 'active')) {
      await updateDoc(profileRef, {
        role: 'admin',
        status: 'active',
        updatedAt: serverTimestamp(),
        updatedByUid: user.uid,
      });

      return {
        ...profile,
        role: 'admin',
        status: 'active',
        updatedByUid: user.uid,
      };
    }

    return profile;
  }

  const signature = getUserSignature(user);
  const profile: UserProfile = {
    uid: user.uid,
    email: signature.email,
    displayName: signature.displayName,
    initials: signature.initials,
    role: getDefaultRole(signature.email),
    status: 'active',
    createdAt: null,
    updatedAt: null,
    createdByUid: user.uid,
    updatedByUid: user.uid,
  };

  await setDoc(profileRef, {
    ...profile,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  return profile;
}

export function subscribeToUsers(
  onUsersChanged: (users: UserProfile[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    query(usersRef, orderBy('displayName')),
    (snapshot) => {
      onUsersChanged(snapshot.docs.map(userProfileFromSnapshot));
    },
    onError,
  );
}

export async function updateUserProfile(
  userId: string,
  updates: Partial<Pick<UserProfile, 'role' | 'status'>>,
  actorUid: string,
): Promise<void> {
  const payload: Partial<UserProfile> = {
    updatedByUid: actorUid,
  };

  if (updates.role !== undefined) {
    payload.role = USER_ROLES.includes(updates.role) ? updates.role : 'user';
  }

  if (updates.status !== undefined) {
    payload.status = USER_STATUSES.includes(updates.status) ? updates.status : 'active';
  }

  await updateDoc(doc(db, USERS_COLLECTION, userId), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

function userProfileFromSnapshot(
  snapshot: QueryDocumentSnapshot<DocumentData> | { id: string; data: () => DocumentData },
): UserProfile {
  const data = snapshot.data();

  return {
    uid: String(data.uid ?? snapshot.id),
    email: String(data.email ?? ''),
    displayName: String(data.displayName ?? data.email ?? 'Unknown user'),
    initials: String(data.initials ?? '?'),
    role: normalizeRole(data.role),
    status: normalizeStatus(data.status),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    createdByUid: String(data.createdByUid ?? ''),
    updatedByUid: String(data.updatedByUid ?? ''),
  };
}

function normalizeRole(value: unknown): UserRole {
  return USER_ROLES.includes(value as UserRole) ? (value as UserRole) : 'user';
}

function normalizeStatus(value: unknown): UserStatus {
  return USER_STATUSES.includes(value as UserStatus) ? (value as UserStatus) : 'active';
}

function getDefaultRole(email: string): UserRole {
  return isBootstrapAdminEmail(email) ? 'admin' : 'user';
}

function isBootstrapAdminEmail(email: string | null): boolean {
  return (email ?? '').trim().toLowerCase() === 'sps.bangkok@gmail.com';
}
