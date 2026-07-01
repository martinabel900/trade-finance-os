import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { contactDocument, contactsCollection, db } from './firestoreService';

export const CAMPAIGNS = ['A', 'B', 'C'];
export const EMAIL_STATUSES = ['Not Sent', 'Sent'];
export const RESPONSE_CATEGORIES = [
  'Uncategorized',
  'Interested',
  'Not Interested',
  'Follow Up',
  'Invalid Contact',
];

export const emptyContact = {
  brokerName: '',
  companyName: '',
  contactName: '',
  email: '',
  campaign: 'A',
  batchNumber: 1,
  emailStatus: 'Not Sent',
  replied: false,
  responseCategory: 'Uncategorized',
  notes: '',
};

export function subscribeToContacts(callback, onError) {
  const contactsQuery = query(
    contactsCollection(),
    orderBy('campaign', 'asc'),
    orderBy('companyName', 'asc'),
  );

  return onSnapshot(
    contactsQuery,
    (snapshot) => {
      callback(snapshot.docs.map((contactDoc) => ({ id: contactDoc.id, ...contactDoc.data() })));
    },
    onError,
  );
}

export function saveContact(contact) {
  const payload = cleanContact(contact);

  if (contact.id) {
    return updateDoc(contactDocument(contact.id), {
      ...payload,
      updatedAt: serverTimestamp(),
    });
  }

  return addDoc(contactsCollection(), {
    ...payload,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

export function updateContact(id, updates) {
  return updateDoc(contactDocument(id), {
    ...updates,
    updatedAt: serverTimestamp(),
  });
}

export async function importContacts(rows) {
  const sortedRows = assignBatchNumbers(rows.map((row) => cleanContact(row)));
  const batch = writeBatch(db);

  sortedRows.forEach((row) => {
    const ref = contactDocument();
    batch.set(ref, {
      ...row,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  });

  await batch.commit();
  return sortedRows.length;
}

export function assignBatchNumbers(contacts) {
  return [...contacts]
    .sort((a, b) => {
      const campaignSort = String(a.campaign || '').localeCompare(String(b.campaign || ''));
      if (campaignSort !== 0) return campaignSort;
      return String(a.companyName || '').localeCompare(String(b.companyName || ''));
    })
    .map((contact, index) => ({
      ...contact,
      batchNumber: Math.floor(index / 10) + 1,
    }));
}

function cleanContact(contact) {
  const campaign = normalizeCampaign(contact.campaign);

  return {
    brokerName: String(contact.brokerName || '').trim(),
    companyName: String(contact.companyName || '').trim(),
    contactName: String(contact.contactName || '').trim(),
    email: String(contact.email || '').trim(),
    campaign,
    batchNumber: Number(contact.batchNumber) || 1,
    emailStatus: contact.emailStatus === 'Sent' ? 'Sent' : 'Not Sent',
    replied: Boolean(contact.replied),
    responseCategory: contact.responseCategory || 'Uncategorized',
    notes: String(contact.notes || '').trim(),
  };
}

export function normalizeCampaign(value) {
  const campaign = String(value || 'A')
    .replace(/campaign/i, '')
    .trim()
    .toUpperCase();

  return CAMPAIGNS.includes(campaign) ? campaign : 'A';
}
