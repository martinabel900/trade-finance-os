import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { HttpsError, onCall } from 'firebase-functions/v2/https';
import './firebaseAdmin.js';
import { requireAnyRole } from './roleSecurity.js';

const db = getFirestore();
const confirmationPhrase = 'DELETE ALL DATA';

interface AdminResetInput {
  confirmation: string;
  backupConfirmed: boolean;
}

export const adminResetData = onCall<AdminResetInput>(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to reset data.');
  }

  await requireAnyRole(request.auth.uid, ['admin']);

  if (request.data.confirmation !== confirmationPhrase || request.data.backupConfirmed !== true) {
    throw new HttpsError('failed-precondition', 'Reset confirmation is incomplete.');
  }

  const actor = {
    uid: request.auth.uid,
    email: String(request.auth.token.email || ''),
    name: String(request.auth.token.name || request.auth.token.email || request.auth.uid),
  };

  await db.collection('adminResetLogs').add({
    type: 'admin_data_reset_requested',
    message: 'Admin data reset requested before handover.',
    collections: ['contacts', 'brokers', 'emailQueue'],
    createdAt: FieldValue.serverTimestamp(),
    createdByUid: actor.uid,
    createdByEmail: actor.email,
    createdByName: actor.name,
  });

  await Promise.all([
    db.recursiveDelete(db.collection('contacts')),
    db.recursiveDelete(db.collection('brokers')),
    db.recursiveDelete(db.collection('emailQueue')),
  ]);

  return {
    success: true,
    message: 'Data reset complete.',
  };
});
