import { getFirestore } from 'firebase-admin/firestore';
import { HttpsError } from 'firebase-functions/v2/https';

export type AppRole = 'admin' | 'manager' | 'user';

const allowedRoles: AppRole[] = ['admin', 'manager', 'user'];

export async function requireAnyRole(uid: string, roles: AppRole[]): Promise<AppRole> {
  const role = await getUserRole(uid);

  if (!roles.includes(role)) {
    throw new HttpsError('permission-denied', 'You do not have permission to perform this action.');
  }

  return role;
}

async function getUserRole(uid: string): Promise<AppRole> {
  const snapshot = await getFirestore().collection('users').doc(uid).get();
  const role = snapshot.get('role');
  const status = snapshot.get('status');

  if (status === 'inactive') {
    throw new HttpsError('permission-denied', 'Your user profile is inactive.');
  }

  return allowedRoles.includes(role as AppRole) ? (role as AppRole) : 'user';
}
