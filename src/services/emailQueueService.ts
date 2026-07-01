import {
  addDoc,
  collection,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, auth, db } from '../firebase/firebase';
import type { Contact } from './contactService';
import { getAttributionFields } from '../utils/userAttribution';

export const EMAIL_QUEUE_COLLECTION = 'emailQueue';
export const EMAIL_QUEUE_STATUSES = ['Pending', 'Sending', 'Sent', 'Failed', 'Cancelled'] as const;

export type EmailQueueStatus = (typeof EMAIL_QUEUE_STATUSES)[number];

export interface EmailQueueItem {
  id: string;
  contactId: string;
  campaign: string;
  template: string;
  subject: string;
  body: string;
  signature: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
  status: EmailQueueStatus;
  attempts: number;
  lastAttemptAt?: Timestamp | null;
  lastError: string;
  queuedAt?: Timestamp | null;
  sentAt?: Timestamp | null;
  createdBy: string;
  createdByUid?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByInitials?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  updatedByName?: string;
  updatedByInitials?: string;
}

export interface ProcessEmailQueueResult {
  success: boolean;
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
}

interface EmailQueueInput {
  contactId: string;
  campaign: string;
  template: string;
  subject: string;
  body: string;
  signature: string;
  recipientEmail: string;
  recipientName: string;
  companyName: string;
}

export interface EmailQueueTemplate {
  subject: string;
  body: string;
  signature: string;
}

const queueRef = collection(db, EMAIL_QUEUE_COLLECTION);

export function contactToEmailQueueInput(contact: Contact, template: EmailQueueTemplate): EmailQueueInput {
  return {
    contactId: contact.id,
    campaign: contact.campaign,
    template: contact.campaign,
    subject: template.subject,
    body: template.body,
    signature: template.signature,
    recipientEmail: contact.email,
    recipientName: contact.contactName,
    companyName: contact.companyName,
  };
}

export async function enqueueCampaignEmail(contact: Contact, template: EmailQueueTemplate): Promise<string> {
  const docRef = await addDoc(queueRef, {
    ...contactToEmailQueueInput(contact, template),
    status: 'Pending',
    attempts: 0,
    lastAttemptAt: null,
    lastError: '',
    queuedAt: serverTimestamp(),
    sentAt: null,
    createdBy: getCurrentActor(),
    ...getAttributionFields('createdBy', auth.currentUser),
    ...getAttributionFields('updatedBy', auth.currentUser),
  });

  return docRef.id;
}

export async function enqueueCampaignBatch(contacts: Contact[], template: EmailQueueTemplate): Promise<void> {
  await Promise.all(contacts.map((contact) => enqueueCampaignEmail(contact, template)));
}

export function subscribeToEmailQueue(
  onQueueChanged: (items: EmailQueueItem[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    query(queueRef, orderBy('queuedAt', 'desc')),
    (snapshot) => {
      onQueueChanged(snapshot.docs.map(emailQueueFromSnapshot));
    },
    onError,
  );
}

export function retryEmailQueueItem(itemId: string): Promise<void> {
  return updateQueueItem(itemId, {
    status: 'Pending',
    lastError: '',
    ...getAttributionFields('updatedBy', auth.currentUser),
  });
}

export function cancelEmailQueueItem(itemId: string): Promise<void> {
  return updateQueueItem(itemId, {
    status: 'Cancelled',
    ...getAttributionFields('updatedBy', auth.currentUser),
  });
}

export async function processEmailQueueNow(): Promise<ProcessEmailQueueResult> {
  const functions = getFunctions(app);
  const processQueue = httpsCallable<void, ProcessEmailQueueResult>(
    functions,
    'processEmailQueueNow',
  );
  const result = await processQueue();

  return result.data;
}

function updateQueueItem(itemId: string, updates: Partial<EmailQueueItem> & { status: EmailQueueStatus }) {
  return updateDoc(doc(db, EMAIL_QUEUE_COLLECTION, itemId), updates);
}

function emailQueueFromSnapshot(snapshot: QueryDocumentSnapshot): EmailQueueItem {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    contactId: String(data.contactId ?? ''),
    campaign: String(data.campaign ?? ''),
    template: String(data.template ?? ''),
    subject: String(data.subject ?? ''),
    body: String(data.body ?? ''),
    signature: String(data.signature ?? ''),
    recipientEmail: String(data.recipientEmail ?? ''),
    recipientName: String(data.recipientName ?? ''),
    companyName: String(data.companyName ?? ''),
    status: normalizeStatus(data.status),
    attempts: Number(data.attempts ?? 0),
    lastAttemptAt: data.lastAttemptAt ?? null,
    lastError: String(data.lastError ?? ''),
    queuedAt: data.queuedAt ?? null,
    sentAt: data.sentAt ?? null,
    createdBy: String(data.createdBy ?? ''),
    createdByUid: String(data.createdByUid ?? ''),
    createdByEmail: String(data.createdByEmail ?? ''),
    createdByName: String(data.createdByName ?? ''),
    createdByInitials: String(data.createdByInitials ?? ''),
    updatedByUid: String(data.updatedByUid ?? ''),
    updatedByEmail: String(data.updatedByEmail ?? ''),
    updatedByName: String(data.updatedByName ?? ''),
    updatedByInitials: String(data.updatedByInitials ?? ''),
  };
}

function normalizeStatus(status: unknown): EmailQueueStatus {
  return EMAIL_QUEUE_STATUSES.includes(status as EmailQueueStatus)
    ? (status as EmailQueueStatus)
    : 'Pending';
}

function getCurrentActor(): string {
  return auth.currentUser?.email || auth.currentUser?.uid || 'Unknown user';
}
