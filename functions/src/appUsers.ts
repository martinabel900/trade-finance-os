import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import './firebaseAdmin.js';
import { passwordSetupActionCodeSettings, sendPasswordSetupEmail } from './passwordSetupEmail.js';
import { requireAnyRole, type AppRole } from './roleSecurity.js';

type AppStatus = 'active' | 'inactive';

interface CreateAppUserInput {
  email: string;
  displayName: string;
  initials: string;
  role: AppRole;
}

interface UpdateAppUserInput {
  uid: string;
  displayName: string;
  initials: string;
  role: AppRole;
  status: AppStatus;
}

interface PasswordResetInput {
  uid: string;
}

interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  initials: string;
  role: AppRole;
  status: AppStatus;
}

interface Actor {
  uid: string;
  email: string;
  displayName: string;
  initials: string;
}

const db = getFirestore();
const auth = getAuth();
const roles: AppRole[] = ['admin', 'manager', 'user'];
const statuses: AppStatus[] = ['active', 'inactive'];

export const createAppUser = onCall<CreateAppUserInput>(async (request) => {
  try {
    const actor = await requireAdmin(request);
    const email = normalizeEmail(request.data.email);
    const displayName = normalizeName(request.data.displayName || email.split('@')[0]);
    const initials = normalizeInitials(request.data.initials || getInitials(displayName));
    const role = normalizeRole(request.data.role);

    if (!email || !isValidEmail(email)) {
      throw new HttpsError('invalid-argument', 'A valid email is required.');
    }

    let userRecord;
    let authUserCreated = false;

    try {
      userRecord = await auth.getUserByEmail(email);
    } catch (error) {
      if (!isAuthUserNotFoundError(error)) {
        throw error;
      }

      userRecord = await auth.createUser({
        email,
        displayName,
        disabled: false,
      });
      authUserCreated = true;
    }

    const userRef = db.collection('users').doc(userRecord.uid);
    const existingProfile = await userRef.get();
    const existingProfileData = existingProfile.data() ?? {};
    const oldProfile = profileFromData(userRecord.uid, existingProfileData);

    await userRef.set(
      {
        uid: userRecord.uid,
        email,
        displayName,
        initials,
        role,
        status: 'active',
        createdAt: existingProfileData.createdAt ?? FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        createdByUid: existingProfileData.createdByUid || actor.uid,
        createdByEmail: existingProfileData.createdByEmail || actor.email,
        createdByName: existingProfileData.createdByName || actor.displayName,
        createdByInitials: existingProfileData.createdByInitials || actor.initials,
        updatedByUid: actor.uid,
        updatedByEmail: actor.email,
        updatedByName: actor.displayName,
        updatedByInitials: actor.initials,
      },
      { merge: true },
    );

    await writeAuditLog({
      action: authUserCreated ? 'created' : existingProfile.exists ? 'updated_existing_auth_user' : 'profile_created_existing_auth_user',
      targetUserUid: userRecord.uid,
      targetUserEmail: email,
      oldRole: oldProfile.role,
      newRole: role,
      oldStatus: oldProfile.status,
      newStatus: 'active',
      actor,
    });

    await sendBrandedPasswordSetupEmail(email, role);
    await writeAuditLog({
      action: 'Password setup email sent',
      targetUserUid: userRecord.uid,
      targetUserEmail: email,
      oldRole: role,
      newRole: role,
      oldStatus: 'active',
      newStatus: 'active',
      actor,
    });

    return {
      success: true,
      uid: userRecord.uid,
      email,
      resetEmail: email,
      message: 'User created and password setup email sent.',
    };
  } catch (error) {
    throw toHttpsError(error, 'create app user');
  }
});

export const updateAppUser = onCall<UpdateAppUserInput>(async (request) => {
  try {
    const actor = await requireAdmin(request);
    const uid = String(request.data.uid || '').trim();
    const displayName = normalizeName(request.data.displayName);
    const initials = normalizeInitials(request.data.initials || getInitials(displayName));
    const role = normalizeRole(request.data.role);
    const status = normalizeStatus(request.data.status);

    if (!uid) {
      throw new HttpsError('invalid-argument', 'User ID is required.');
    }

    const userRef = db.collection('users').doc(uid);
    const snapshot = await userRef.get();

    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'User profile was not found.');
    }

    const oldProfile = profileFromData(uid, snapshot.data());
    const email = oldProfile.email || String(snapshot.get('email') || '');

    if (uid === actor.uid && status === 'inactive') {
      throw new HttpsError('failed-precondition', 'You cannot deactivate your own admin account.');
    }

    if (uid === actor.uid && oldProfile.role === 'admin' && role !== 'admin') {
      await assertAnotherActiveAdmin(uid);
    }

    if (oldProfile.role === 'admin' && oldProfile.status === 'active' && (role !== 'admin' || status !== 'active')) {
      await assertAnotherActiveAdmin(uid);
    }

    await userRef.update({
      displayName,
      initials,
      role,
      status,
      updatedAt: FieldValue.serverTimestamp(),
      updatedByUid: actor.uid,
      updatedByEmail: actor.email,
      updatedByName: actor.displayName,
      updatedByInitials: actor.initials,
    });

    await auth.updateUser(uid, {
      displayName,
      disabled: status === 'inactive',
    });

    await writeAuditLog({
      action: oldProfile.status !== status ? (status === 'active' ? 'reactivated' : 'deactivated') : 'updated',
      targetUserUid: uid,
      targetUserEmail: email,
      oldRole: oldProfile.role,
      newRole: role,
      oldStatus: oldProfile.status,
      newStatus: status,
      actor,
    });

    return {
      success: true,
      message: 'User updated.',
    };
  } catch (error) {
    throw toHttpsError(error, 'update app user');
  }
});

export const approvePasswordReset = onCall<PasswordResetInput>(async (request) => {
  try {
    const actor = await requireAdmin(request);
    const uid = String(request.data.uid || '').trim();

    if (!uid) {
      throw new HttpsError('invalid-argument', 'User ID is required.');
    }

    const snapshot = await db.collection('users').doc(uid).get();
    if (!snapshot.exists) {
      throw new HttpsError('not-found', 'User profile was not found.');
    }

    const profile = profileFromData(uid, snapshot.data());
    if (!profile.email) {
      throw new HttpsError('failed-precondition', 'User profile has no email address.');
    }

    await sendBrandedPasswordSetupEmail(profile.email, profile.role);
    await writeAuditLog({
      action: 'Password setup email sent',
      targetUserUid: uid,
      targetUserEmail: profile.email,
      oldRole: profile.role,
      newRole: profile.role,
      oldStatus: profile.status,
      newStatus: profile.status,
      actor,
    });

    return {
      success: true,
      email: profile.email,
      message: 'Password setup email sent.',
    };
  } catch (error) {
    throw toHttpsError(error, 'approve password reset');
  }
});

async function requireAdmin(request: CallableRequest): Promise<Actor> {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in.');
  }

  await requireAnyRole(request.auth.uid, ['admin']);

  const email = String(request.auth.token.email || '');
  const displayName = normalizeName(String(request.auth.token.name || email.split('@')[0] || 'Unknown user'));

  return {
    uid: request.auth.uid,
    email,
    displayName,
    initials: getInitials(displayName),
  };
}

async function sendBrandedPasswordSetupEmail(email: string, role: AppRole): Promise<void> {
  const passwordSetupLink = await auth.generatePasswordResetLink(email, passwordSetupActionCodeSettings);

  await sendPasswordSetupEmail({
    email,
    role,
    passwordSetupLink,
  });
}

async function assertAnotherActiveAdmin(currentUid: string): Promise<void> {
  const snapshot = await db
    .collection('users')
    .where('role', '==', 'admin')
    .where('status', '==', 'active')
    .get();

  const otherActiveAdminExists = snapshot.docs.some((doc) => doc.id !== currentUid);

  if (!otherActiveAdminExists) {
    throw new HttpsError('failed-precondition', 'At least one active admin must remain.');
  }
}

async function writeAuditLog({
  action,
  targetUserUid,
  targetUserEmail,
  oldRole,
  newRole,
  oldStatus,
  newStatus,
  actor,
}: {
  action: string;
  targetUserUid: string;
  targetUserEmail: string;
  oldRole: string;
  newRole: string;
  oldStatus: string;
  newStatus: string;
  actor: Actor;
}) {
  await db.collection('userAuditLogs').add({
    action,
    targetUserUid,
    targetUserEmail,
    oldRole,
    newRole,
    oldStatus,
    newStatus,
    performedByUid: actor.uid,
    performedByEmail: actor.email,
    performedByName: actor.displayName,
    performedByInitials: actor.initials,
    createdAt: FieldValue.serverTimestamp(),
  });
}

function profileFromData(uid: string, data: FirebaseFirestore.DocumentData | undefined): UserProfile {
  return {
    uid,
    email: String(data?.email ?? ''),
    displayName: String(data?.displayName ?? ''),
    initials: String(data?.initials ?? ''),
    role: normalizeRole(data?.role),
    status: normalizeStatus(data?.status),
  };
}

function normalizeRole(value: unknown): AppRole {
  return roles.includes(value as AppRole) ? (value as AppRole) : 'user';
}

function normalizeStatus(value: unknown): AppStatus {
  return statuses.includes(value as AppStatus) ? (value as AppStatus) : 'active';
}

function normalizeEmail(value: string): string {
  return String(value || '').trim().toLowerCase();
}

function normalizeName(value: string): string {
  return String(value || '')
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
    .join(' ') || 'Unknown user';
}

function normalizeInitials(value: string): string {
  return String(value || '')
    .replace(/[^a-z]/gi, '')
    .slice(0, 3)
    .toUpperCase() || '?';
}

function getInitials(displayName: string): string {
  const words = displayName.trim().split(/\s+/).filter(Boolean);

  if (!words.length) {
    return '?';
  }

  return words
    .slice(0, 2)
    .map((word) => word.charAt(0).toUpperCase())
    .join('');
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function isAuthUserNotFoundError(error: unknown): boolean {
  return Boolean(
    error &&
      typeof error === 'object' &&
      'code' in error &&
      String((error as { code?: unknown }).code) === 'auth/user-not-found',
  );
}

function toHttpsError(error: unknown, action: string): HttpsError {
  if (error instanceof HttpsError) {
    return error;
  }

  const message = error instanceof Error ? error.message : `Unable to ${action}.`;
  const code = getErrorCode(error);

  console.error(`Failed to ${action}`, {
    code,
    message,
  });

  if (code.startsWith('auth/')) {
    return new HttpsError('failed-precondition', message);
  }

  return new HttpsError('internal', message);
}

function getErrorCode(error: unknown): string {
  if (error && typeof error === 'object' && 'code' in error) {
    return String((error as { code?: unknown }).code ?? '');
  }

  return '';
}
