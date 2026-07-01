import { FieldValue, getFirestore, Timestamp } from 'firebase-admin/firestore';
import { onDocumentWritten } from 'firebase-functions/v2/firestore';
import { HttpsError, onCall, type CallableRequest } from 'firebase-functions/v2/https';
import './firebaseAdmin.js';
import { sendSmtpCampaignEmail } from './campaignEmail.js';

interface EmailQueueRecord {
  contactId: string;
  campaign: string;
  template: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  subject?: string;
  body?: string;
  signature?: string;
  status: string;
  attempts: number;
  createdBy: string;
}

interface UserSignature {
  uid: string;
  email: string;
  displayName: string;
  initials: string;
}

const db = getFirestore();

export const processEmailQueue = onDocumentWritten('emailQueue/{queueId}', async (event) => {
  const snapshot = event.data?.after;

  if (!snapshot?.exists) {
    return;
  }

  if ((snapshot.data() as EmailQueueRecord).status !== 'Pending') {
    return;
  }

  console.log(`Email queue ${event.params.queueId} is pending. Manual processing is required.`);
});

export const processEmailQueueNow = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'You must be signed in to process email queue.');
  }

  const pendingSnapshot = await db
    .collection('emailQueue')
    .where('status', '==', 'Pending')
    .get();
  const actor = getUserSignature(request);
  const results = await Promise.all(
    pendingSnapshot.docs.map((docSnapshot) => processQueueDocument(docSnapshot.ref, docSnapshot.id, actor)),
  );
  const sent = results.filter((result) => result === 'Sent').length;
  const failed = results.filter((result) => result === 'Failed').length;
  const skipped = results.filter((result) => result === 'Skipped').length;

  return {
    success: true,
    processed: results.length,
    sent,
    failed,
    skipped,
  };
});

async function processQueueDocument(
  queueRef: FirebaseFirestore.DocumentReference,
  queueId: string,
  actor: UserSignature,
): Promise<'Sent' | 'Failed' | 'Skipped'> {
  const claimedData = await db.runTransaction(async (transaction) => {
    const current = await transaction.get(queueRef);
    const currentData = current.data() as EmailQueueRecord | undefined;

    if (!current.exists || currentData?.status !== 'Pending') {
      return null;
    }

    transaction.update(queueRef, {
      status: 'Sending',
      lastAttemptAt: FieldValue.serverTimestamp(),
      lastError: '',
      ...getAttributionFields('updatedBy', actor),
    });

    return currentData;
  });

  if (!claimedData) {
    return 'Skipped';
  }

  try {
    await sendSmtpCampaignEmail({
      to: claimedData.recipientEmail,
      contactName: claimedData.recipientName,
      companyName: claimedData.companyName,
      campaign: claimedData.campaign,
      subject: claimedData.subject,
      body: claimedData.body,
      signature: claimedData.signature,
    });

    const contactRef = db.collection('contacts').doc(claimedData.contactId);
    const activityRef = contactRef.collection('activity').doc();

    await db.runTransaction(async (transaction) => {
      transaction.update(queueRef, {
        status: 'Sent',
        sentAt: FieldValue.serverTimestamp(),
        lastError: '',
        ...getAttributionFields('updatedBy', actor),
      });
      transaction.update(contactRef, {
        emailStatus: 'Sent',
        emailSentAt: FieldValue.serverTimestamp(),
        sentTemplate: claimedData.campaign,
        updatedAt: FieldValue.serverTimestamp(),
        ...getAttributionFields('updatedBy', actor),
      });
      transaction.set(activityRef, {
        type: 'campaign_email_sent',
        message: `Campaign ${claimedData.campaign} email sent from queue.`,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: actor.displayName || claimedData.createdBy || 'System',
        ...getActivityAttributionFields(actor),
      });
    });

    return 'Sent';
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to send queued email.';

    await queueRef.update({
      status: 'Failed',
      attempts: FieldValue.increment(1),
      lastError: message,
      lastAttemptAt: Timestamp.now(),
      ...getAttributionFields('updatedBy', actor),
    });

    console.error(`Email queue ${queueId} failed: ${message}`);
    return 'Failed';
  }
}

function getUserSignature(request: CallableRequest): UserSignature {
  const email = String(request.auth?.token.email || '');
  const displayName = normalizeDisplayName(String(request.auth?.token.name || email.split('@')[0] || 'Unknown user'));

  return {
    uid: request.auth?.uid || '',
    email,
    displayName,
    initials: getInitials(displayName),
  };
}

function getAttributionFields(prefix: 'createdBy' | 'updatedBy', actor: UserSignature) {
  return {
    [`${prefix}Uid`]: actor.uid,
    [`${prefix}Email`]: actor.email,
    [`${prefix}Name`]: actor.displayName,
    [`${prefix}Initials`]: actor.initials,
  };
}

function getActivityAttributionFields(actor: UserSignature) {
  return {
    createdByUid: actor.uid,
    createdByEmail: actor.email,
    createdByName: actor.displayName,
    createdByInitials: actor.initials,
  };
}

function normalizeDisplayName(value: string): string {
  const words = value
    .replace(/[._-]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (!words.length) {
    return 'Unknown user';
  }

  return words.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`).join(' ');
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
