import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  type DocumentData,
  type FieldValue,
  type FirestoreError,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase/firebase';
import { getAttributionFields, getUserSignature } from '../utils/userAttribution';

export const CONTACTS_COLLECTION = 'contacts';
export const CAMPAIGNS = ['A', 'B', 'C'] as const;
export const EMAIL_STATUSES = ['Not Sent', 'Sent'] as const;
export const REPLY_STATUSES = ['No Reply', 'Replied'] as const;
export const RESPONSE_CATEGORIES = [
  'Still active',
  'Completed elsewhere',
  'Supplier rejected issuing bank',
  'Fee too expensive',
  'No funds for issuance fee',
  'Transaction cancelled',
  'Broker disappeared',
  'Compliance/KYC issue',
  'Bank rejected structure',
  'No reply',
  'Other',
] as const;
export const DEAL_STATUSES = [
  'Active',
  'Reopened',
  'Lost',
  'No Reply',
  'Do Not Contact',
  'Archived',
] as const;

export type Campaign = (typeof CAMPAIGNS)[number];
export type EmailStatus = (typeof EMAIL_STATUSES)[number];
export type ReplyStatus = (typeof REPLY_STATUSES)[number];
export type ResponseCategory = (typeof RESPONSE_CATEGORIES)[number];
export type DealStatus = (typeof DEAL_STATUSES)[number];

export interface Contact {
  id: string;
  brokerName: string;
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  campaign: string;
  batch: string;
  emailStatus: string;
  replyStatus: string;
  responseCategory: string;
  notes: string;
  lastReplyAt?: Timestamp | null;
  lastReplyByUid?: string;
  lastReplyByEmail?: string;
  lastReplyByName?: string;
  lastReplyByInitials?: string;
  nextAction?: string;
  nextFollowUpDate?: Timestamp | null;
  dealStatus?: string;
  archivedAt?: Timestamp | null;
  archivedByUid?: string;
  archivedByEmail?: string;
  archivedByName?: string;
  archivedByInitials?: string;
  emailSentAt?: Timestamp | null;
  sentTemplate?: string;
  createdAt?: Timestamp | null;
  updatedAt?: Timestamp | null;
  createdByUid?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByInitials?: string;
  updatedByUid?: string;
  updatedByEmail?: string;
  updatedByName?: string;
  updatedByInitials?: string;
}

type ContactAttributionFields =
  | 'createdByUid'
  | 'createdByEmail'
  | 'createdByName'
  | 'createdByInitials'
  | 'updatedByUid'
  | 'updatedByEmail'
  | 'updatedByName'
  | 'updatedByInitials'
  | 'lastReplyByUid'
  | 'lastReplyByEmail'
  | 'lastReplyByName'
  | 'lastReplyByInitials'
  | 'archivedByUid'
  | 'archivedByEmail'
  | 'archivedByName'
  | 'archivedByInitials';

export type ContactInput = Omit<Contact, 'id' | 'createdAt' | 'updatedAt' | ContactAttributionFields>;

export type ContactUpdate = Partial<ContactInput> & {
  emailSentAt?: Timestamp | FieldValue | null;
  lastReplyAt?: Timestamp | FieldValue | null;
  lastReplyByUid?: string;
  lastReplyByEmail?: string;
  lastReplyByName?: string;
  lastReplyByInitials?: string;
  nextFollowUpDate?: Timestamp | FieldValue | null;
  archivedAt?: Timestamp | FieldValue | null;
  archivedByUid?: string;
  archivedByEmail?: string;
  archivedByName?: string;
  archivedByInitials?: string;
  sentTemplate?: string;
};

export interface ReplyLogInput {
  replyDate: string;
  responseCategory: string;
  dealStatus: string;
  nextAction: string;
  nextFollowUpDate: string;
  notes: string;
}

export interface ContactActivity {
  id: string;
  type: string;
  message: string;
  createdAt?: Timestamp | null;
  createdBy: string;
  createdByUid?: string;
  createdByEmail?: string;
  createdByName?: string;
  createdByInitials?: string;
}

export interface ContactActivityInput {
  type: string;
  message: string;
}

export const emptyContact: ContactInput = {
  brokerName: '',
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  campaign: 'A',
  batch: '1',
  emailStatus: 'Not Sent',
  replyStatus: 'No Reply',
  responseCategory: 'No reply',
  notes: '',
  nextAction: '',
  dealStatus: 'No Reply',
};

const contactsRef = collection(db, CONTACTS_COLLECTION);

function activityCollection(contactId: string) {
  return collection(db, CONTACTS_COLLECTION, contactId, 'activity');
}

function getFirestoreErrorMessage(action: string, error: unknown): string {
  if (error instanceof Error) {
    return `Failed to ${action}: ${error.message}`;
  }

  return `Failed to ${action}.`;
}

function contactFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): Contact {
  const data = snapshot.data();
  const legacyReplied = Boolean(data.replied);

  return {
    id: snapshot.id,
    brokerName: String(data.brokerName ?? ''),
    companyName: String(data.companyName ?? ''),
    contactName: String(data.contactName ?? ''),
    email: String(data.email ?? ''),
    phone: String(data.phone ?? ''),
    campaign: String(data.campaign ?? ''),
    batch: String(data.batch ?? data.batchNumber ?? ''),
    emailStatus: String(data.emailStatus ?? ''),
    replyStatus: String(data.replyStatus ?? (legacyReplied ? 'Replied' : 'No Reply')),
    responseCategory: String(data.responseCategory ?? ''),
    notes: String(data.notes ?? ''),
    lastReplyAt: data.lastReplyAt ?? null,
    lastReplyByUid: String(data.lastReplyByUid ?? ''),
    lastReplyByEmail: String(data.lastReplyByEmail ?? ''),
    lastReplyByName: String(data.lastReplyByName ?? ''),
    lastReplyByInitials: String(data.lastReplyByInitials ?? ''),
    nextAction: String(data.nextAction ?? ''),
    nextFollowUpDate: data.nextFollowUpDate ?? null,
    dealStatus: String(data.dealStatus ?? ''),
    archivedAt: data.archivedAt ?? null,
    archivedByUid: String(data.archivedByUid ?? ''),
    archivedByEmail: String(data.archivedByEmail ?? ''),
    archivedByName: String(data.archivedByName ?? ''),
    archivedByInitials: String(data.archivedByInitials ?? ''),
    emailSentAt: data.emailSentAt ?? null,
    sentTemplate: String(data.sentTemplate ?? ''),
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
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

function activityFromSnapshot(snapshot: QueryDocumentSnapshot<DocumentData>): ContactActivity {
  const data = snapshot.data();

  return {
    id: snapshot.id,
    type: String(data.type ?? ''),
    message: String(data.message ?? ''),
    createdAt: data.createdAt ?? null,
    createdBy: String(data.createdBy ?? ''),
    createdByUid: String(data.createdByUid ?? ''),
    createdByEmail: String(data.createdByEmail ?? ''),
    createdByName: String(data.createdByName ?? ''),
    createdByInitials: String(data.createdByInitials ?? ''),
  };
}

function getCurrentActor(): string {
  return auth.currentUser?.email || auth.currentUser?.uid || 'Unknown user';
}

function cleanContact(contact: ContactInput): ContactInput {
  return {
    brokerName: contact.brokerName.trim(),
    companyName: contact.companyName.trim(),
    contactName: contact.contactName.trim(),
    email: contact.email.trim(),
    phone: contact.phone.trim(),
    campaign: CAMPAIGNS.includes(contact.campaign as Campaign) ? contact.campaign : 'A',
    batch: String(contact.batch || '1').trim(),
    emailStatus: EMAIL_STATUSES.includes(contact.emailStatus as EmailStatus)
      ? contact.emailStatus
      : 'Not Sent',
    replyStatus: REPLY_STATUSES.includes(contact.replyStatus as ReplyStatus)
      ? contact.replyStatus
      : 'No Reply',
    responseCategory: contact.responseCategory.trim(),
    notes: contact.notes.trim(),
    lastReplyAt: contact.lastReplyAt ?? null,
    nextAction: contact.nextAction?.trim() ?? '',
    nextFollowUpDate: contact.nextFollowUpDate ?? null,
    dealStatus: contact.dealStatus?.trim() || 'No Reply',
    archivedAt: contact.archivedAt ?? null,
  };
}

function cleanContactUpdate(updates: ContactUpdate): ContactUpdate {
  const payload: ContactUpdate = {};

  if (updates.brokerName !== undefined) payload.brokerName = updates.brokerName.trim();
  if (updates.companyName !== undefined) payload.companyName = updates.companyName.trim();
  if (updates.contactName !== undefined) payload.contactName = updates.contactName.trim();
  if (updates.email !== undefined) payload.email = updates.email.trim();
  if (updates.phone !== undefined) payload.phone = updates.phone.trim();
  if (updates.campaign !== undefined) {
    payload.campaign = CAMPAIGNS.includes(updates.campaign as Campaign) ? updates.campaign : 'A';
  }
  if (updates.batch !== undefined) payload.batch = String(updates.batch || '1').trim();
  if (updates.emailStatus !== undefined) {
    payload.emailStatus = EMAIL_STATUSES.includes(updates.emailStatus as EmailStatus)
      ? updates.emailStatus
      : 'Not Sent';
  }
  if (updates.replyStatus !== undefined) {
    payload.replyStatus = REPLY_STATUSES.includes(updates.replyStatus as ReplyStatus)
      ? updates.replyStatus
      : 'No Reply';
  }
  if (updates.responseCategory !== undefined) {
    payload.responseCategory = updates.responseCategory.trim();
  }
  if (updates.notes !== undefined) payload.notes = updates.notes.trim();
  if (updates.lastReplyAt !== undefined) payload.lastReplyAt = updates.lastReplyAt;
  if (updates.lastReplyByUid !== undefined) payload.lastReplyByUid = updates.lastReplyByUid.trim();
  if (updates.lastReplyByEmail !== undefined) payload.lastReplyByEmail = updates.lastReplyByEmail.trim();
  if (updates.lastReplyByName !== undefined) payload.lastReplyByName = updates.lastReplyByName.trim();
  if (updates.lastReplyByInitials !== undefined) payload.lastReplyByInitials = updates.lastReplyByInitials.trim();
  if (updates.nextAction !== undefined) payload.nextAction = updates.nextAction.trim();
  if (updates.nextFollowUpDate !== undefined) payload.nextFollowUpDate = updates.nextFollowUpDate;
  if (updates.dealStatus !== undefined) payload.dealStatus = updates.dealStatus.trim();
  if (updates.archivedAt !== undefined) payload.archivedAt = updates.archivedAt;
  if (updates.archivedByUid !== undefined) payload.archivedByUid = updates.archivedByUid.trim();
  if (updates.archivedByEmail !== undefined) payload.archivedByEmail = updates.archivedByEmail.trim();
  if (updates.archivedByName !== undefined) payload.archivedByName = updates.archivedByName.trim();
  if (updates.archivedByInitials !== undefined) payload.archivedByInitials = updates.archivedByInitials.trim();
  if (updates.emailSentAt !== undefined) payload.emailSentAt = updates.emailSentAt;
  if (updates.sentTemplate !== undefined) payload.sentTemplate = updates.sentTemplate.trim();

  return payload;
}

export async function archiveContact(contactId: string): Promise<void> {
  const actor = getUserSignature(auth.currentUser);

  await updateContact(
    contactId,
    {
      dealStatus: 'Archived',
      archivedAt: serverTimestamp(),
      archivedByUid: actor.uid,
      archivedByEmail: actor.email,
      archivedByName: actor.displayName,
      archivedByInitials: actor.initials,
    },
    {
      type: 'archived',
      message: `Contact archived by ${actor.initials}`,
    },
  );
}

export async function logContactReply(contactId: string, input: ReplyLogInput): Promise<void> {
  const actor = getUserSignature(auth.currentUser);
  const responseCategory = input.responseCategory.trim() || 'Other';
  const replyDate = input.replyDate ? Timestamp.fromDate(new Date(input.replyDate)) : Timestamp.now();
  const nextFollowUpDate = input.nextFollowUpDate
    ? Timestamp.fromDate(new Date(input.nextFollowUpDate))
    : null;

  await updateContact(
    contactId,
    {
      replyStatus: 'Replied',
      responseCategory,
      lastReplyAt: replyDate,
      lastReplyByUid: actor.uid,
      lastReplyByEmail: actor.email,
      lastReplyByName: actor.displayName,
      lastReplyByInitials: actor.initials,
      nextAction: input.nextAction,
      nextFollowUpDate,
      dealStatus: input.dealStatus || 'Active',
      notes: input.notes,
    },
    {
      type: 'reply_logged',
      message: `Reply logged by ${actor.initials}: ${responseCategory}`,
    },
  );
}

function sortContacts(contacts: Contact[]): Contact[] {
  return [...contacts].sort((a, b) => {
    const campaignSort = a.campaign.localeCompare(b.campaign);
    if (campaignSort !== 0) return campaignSort;

    return a.companyName.localeCompare(b.companyName);
  });
}

export async function createContact(
  contact: ContactInput,
  activity?: ContactActivityInput,
): Promise<string> {
  try {
    const payload = cleanContact(contact);
    const docRef = await addDoc(contactsRef, {
      ...payload,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      ...getAttributionFields('createdBy', auth.currentUser),
      ...getAttributionFields('updatedBy', auth.currentUser),
    });

    if (activity) {
      await createContactActivity(docRef.id, activity);
    }

    return docRef.id;
  } catch (error) {
    throw new Error(getFirestoreErrorMessage('create contact', error));
  }
}

export async function getContacts(): Promise<Contact[]> {
  try {
    const snapshot = await getDocs(contactsRef);

    return sortContacts(snapshot.docs.map(contactFromSnapshot));
  } catch (error) {
    throw new Error(getFirestoreErrorMessage('get contacts', error));
  }
}

export async function updateContact(
  contactId: string,
  updates: ContactUpdate,
  activity?: ContactActivityInput,
): Promise<void> {
  try {
    const payload = cleanContactUpdate(updates);
    await updateDoc(doc(db, CONTACTS_COLLECTION, contactId), {
      ...payload,
      updatedAt: serverTimestamp(),
      ...getAttributionFields('updatedBy', auth.currentUser),
    });

    if (activity) {
      await createContactActivity(contactId, activity);
    }
  } catch (error) {
    throw new Error(getFirestoreErrorMessage('update contact', error));
  }
}

export function subscribeToContacts(
  onContactsChanged: (contacts: Contact[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  return onSnapshot(
    contactsRef,
    (snapshot) => {
      onContactsChanged(sortContacts(snapshot.docs.map(contactFromSnapshot)));
    },
    onError,
  );
}

export async function createContactActivity(
  contactId: string,
  activity: ContactActivityInput,
): Promise<void> {
  try {
    await addDoc(activityCollection(contactId), {
      type: activity.type,
      message: activity.message,
      createdAt: serverTimestamp(),
      createdBy: getCurrentActor(),
      ...getActivityAttributionFields(),
    });
  } catch (error) {
    throw new Error(getFirestoreErrorMessage('create activity', error));
  }
}

export function subscribeToContactActivity(
  contactId: string,
  onActivityChanged: (activity: ContactActivity[]) => void,
  onError?: (error: FirestoreError) => void,
): Unsubscribe {
  const activityQuery = query(activityCollection(contactId), orderBy('createdAt', 'desc'), limit(8));

  return onSnapshot(
    activityQuery,
    (snapshot) => {
      onActivityChanged(snapshot.docs.map(activityFromSnapshot));
    },
    onError,
  );
}

function getActivityAttributionFields() {
  const signature = getUserSignature(auth.currentUser);

  return {
    createdByUid: signature.uid,
    createdByEmail: signature.email,
    createdByName: signature.displayName,
    createdByInitials: signature.initials,
  };
}
